# Streaming Video to a Boat Game: Building a Custom Codec for Stormworks

## The Dumbest Idea I've Had in a While

It started, as these things always do, with a question nobody asked: _could I stream video into Stormworks?_

For the uninitiated, Stormworks: Build and Rescue is a game about building boats and rescue vehicles. It has Lua scripting, monitors you can draw pixels to, and HTTP request support.

That's it. That's all my brain needed to go "okay but what if video player."

What followed was weeks of custom compression algorithms, delta encoding, palette quantization, audio sync, and more debugging than I want to think about.

And yeah, I got it working. Video playback. In a boat game. With audio sync.

Why? Honestly couldn't tell you.

---

## The Constraints

Okay so here's what I was working with, and it's... a lot:

Lua in Stormworks is _limited_. 60 ticks per second, no threading, no binary data (everything's strings), and no bit operations. Not "limited bit operations." None. Zero. We'll come back to this.

HTTP responses cap at ~195KB. Anything bigger gets silently truncated. Oh and max 40 responses per second. Quick math: that's a theoretical ceiling of about 1 Mbps. Honestly not that bad but... that is the mathematical maximum.

Drawing is primitive. Filled rectangles, basically. No direct pixel buffer access at reasonable speeds.

Monitor resolution is 288×160. That's 46,080 pixels that need to get from my server to the game, decoded, and drawn, ideally 30 times per second.

Also null bytes in HTTP responses terminate the string early. Because of course they do.

---

## Step 1: The Naive Approach

Started simple. Go server extracts frames with ffmpeg, sends them to the game. First question: can I get _any_ image data into Stormworks at all?

Yes, but immediately hit the null byte problem. Any `0x00` in my data and Lua treats it as end-of-string.

Solution: escape encoding.

```go
func escapeEncode(data []byte) []byte {
    var out bytes.Buffer
    for _, b := range data {
        if b == 0 {
            out.WriteByte(255)
            out.WriteByte(1)
        } else if b == 255 {
            out.WriteByte(255)
            out.WriteByte(2)
        } else {
            out.WriteByte(b)
        }
    }
    return out.Bytes()
}
```

`0x00` becomes `0xFF 0x01`. `0xFF` becomes `0xFF 0x02`. Everything else passes through. Reverse it on the Lua side.

---

## Step 2: Palette Indexing

Raw RGB was never gonna work. 3 bytes × 46,080 pixels = 138KB per frame before escape encoding. Way too big.

So, palette indexing. Sample colors from across the video, median-cut quantiza- blah blah some math to find the best 32 colors, each pixel becomes a single byte index.

Now a frame is 46KB before compression. Better, but still too big for batching.

```go
func medianCutPalette(samples []color.RGBA, nColors int) []color.RGBA {
    boxes := []*colorBox{{colors: samples}}

    for len(boxes) < nColors {
        // Find box with largest volume in RGB space
        maxIdx := 0
        maxVol := boxes[0].volume()
        for i, box := range boxes {
            if v := box.volume(); v > maxVol {
                maxVol = v
                maxIdx = i
            }
        }

        // Split along longest axis
        box := boxes[maxIdx]
        box1, box2 := box.split()
        boxes[maxIdx] = box1
        boxes = append(boxes, box2)
    }

    // Average each box for final palette
    pal := make([]color.RGBA, len(boxes))
    for i, box := range boxes {
        pal[i] = box.average()
    }
    return pal
}
```

---

## Step 3: Run-Length Encoding

Video frames have tons of horizontal runs of the same color. Blue sky? Hundreds of consecutive pixels with the same palette index. RLE eats this up:

```go
func rleEncode(data []byte) []byte {
    var out bytes.Buffer
    i := 0
    for i < len(data) {
        val := data[i]
        count := 1
        for i+count < len(data) && data[i+count] == val && count < 255 {
            count++
        }
        out.WriteByte(byte(count))
        out.WriteByte(val)
        i += count
    }
    return out.Bytes()
}
```

200 blue pixels becomes 2 bytes: `200, 12` (if blue is index 12).

Lua side is straightforward:

```lua
function rleDecode(data, pixels)
    local out = {}
    local pos = 1
    local outPos = 1

    while pos <= #data - 1 and outPos <= pixels do
        local count, val
        count, pos = readEsc(data, pos)
        val, pos = readEsc(data, pos)
        if not count or not val then break end
        for _ = 1, count do
            if outPos <= pixels then
                out[outPos] = val
                outPos = outPos + 1
            end
        end
    end

    return out
end
```

---

## Step 4: Delta Encoding (P-Frames)

Here's where it gets fun. Consecutive video frames are usually very similar. Talking head video? Maybe 90% of pixels identical between frames.

Instead of encoding each frame independently, encode the _difference_ from the previous frame. I-frames (full) and P-frames (delta).

Simplest difference encoding is XOR. Same pixel = zero. Changed pixel = non-zero.

```go
func xorFrames(prev, curr []byte) []byte {
    result := make([]byte, len(curr))
    for i := range curr {
        result[i] = prev[i] ^ curr[i]
    }
    return result
}
```

The magic: XOR'd frames of static content are mostly zeros. RLE _loves_ runs of zeros. P-frame of a mostly static scene might compress to 5% of an I-frame.

But wait. Remember when I said Stormworks Lua has no bit operations?

Yeah. No XOR.

So I made my own with a lookup table:

```lua
xorTab = {}
for i = 0, 255 do
    xorTab[i] = {}
    for j = 0, 255 do
        local r, m, a, b = 0, 1, i, j
        for _ = 1, 8 do
            if a % 2 ~= b % 2 then r = r + m end
            a = math.floor(a / 2)
            b = math.floor(b / 2)
            m = m * 2
        end
        xorTab[i][j] = r
    end
end

function bxor(a, b)
    return xorTab[a][b]
end
```

256×256 lookup table, computed once at startup. `xorTab[173][42]` gives you `173 XOR 42` instantly. Brute force? Absolutely. Works? Also absolutely.

---

## Step 5: LZ4 Compression

RLE's great for horizontal runs but some frames don't have clean patterns. So I added LZ4 as an alternative, finds repeated patterns anywhere in the data, not just consecutive bytes.

Server tries LZ4 first. If it's smaller than RLE, use it. Otherwise fall back:

```go
buf := make([]byte, lz4.CompressBlockBound(len(toCompress)))
n, err := lz4.CompressBlock(toCompress, buf, nil)

if err == nil && n > 0 && n < len(toCompress) {
    compressed = buf[:n]
    actualType = 'L' // LZ4 I-frame
} else {
    compressed = rleEncode(toCompress)
    actualType = 'R' // RLE I-frame
}
```

Different frame type markers so Lua knows which decoder to use:

-   `L` = LZ4 I-frame
-   `l` = LZ4 P-frame
-   `R` = RLE I-frame
-   `r` = RLE P-frame

LZ4 decoder in Lua is chunkier but it works:

```lua
function lz4Decode(data, pixels)
    local out = {}
    local pos = 1
    local outPos = 1

    while pos <= #data and outPos <= pixels do
        local token
        token, pos = readEsc(data, pos)
        if not token then break end

        local litLenToken = math.floor(token / 16)
        local matchLenToken = token % 16

        -- Read literal length
        local litLen = litLenToken
        if litLenToken == 15 then
            repeat
                local b
                b, pos = readEsc(data, pos)
                if not b then break end
                litLen = litLen + b
            until b < 255
        end

        -- Copy literals
        for _ = 1, litLen do
            local v
            v, pos = readEsc(data, pos)
            if not v then break end
            out[outPos] = v
            outPos = outPos + 1
        end

        if pos > #data then break end

        -- Read match offset
        local offset
        offset, pos = readEscU16(data, pos)
        if not offset or offset == 0 then break end

        -- Read match length
        local matchLen = matchLenToken + 4
        if matchLenToken == 15 then
            repeat
                local b
                b, pos = readEsc(data, pos)
                if not b then break end
                matchLen = matchLen + b
            until b < 255
        end

        -- Copy match
        local src = outPos - offset
        for _ = 1, matchLen do
            if src >= 1 and outPos <= pixels then
                out[outPos] = out[src]
                outPos = outPos + 1
                src = src + 1
            end
        end
    end

    return out
end
```

In practice LZ4 wins 99.8% of the time. The RLE fallback barely gets used.

---

## Step 6: Batching and Buffering

One frame per HTTP request would be way too much overhead (and caused noticeable lag in testing).

Jessie, We need to batch.

![Jessie we need to cook gif](https://media1.tenor.com/m/hRxU7RYOlMkAAAAC/breaking-bad-chemistry.gif)

Server sends 30 frames per batch: color palette, frame dimensions, frame count, compressed data.

Client keeps a buffer of decoded frames, plays through them while requesting more. Basic streaming 101:

```lua
PRE_BUFFER = 90   -- Buffer 90 frames before starting
MIN_BUFFER = 200  -- Request more when below 200

function requestMoreFrames(currentFrame)
    if inFlight < MAX_FLY and highestRequested < currentFrame + MIN_BUFFER then
        local nextStart = highestRequested + 1
        if nextStart < totalFrames then
            inFlight = inFlight + 1
            async.httpGet(8832, "/batch?start=" .. nextStart .. "&count=" .. BATCH_SIZE)
        end
    end
end
```

---

## Step 7: Audio Sync

Video without audio sync is just a fancy slideshow. Client needs to know what frame it _should_ be showing based on audio position.

Server plays audio (extracted as WAV) and tracks start time:

```go
func startAudio() {
    audioStartTime = time.Now()
    audioCmd = exec.Command("paplay", audioFile)
    audioCmd.Start()
    audioStarted = true
}

func getSyncFrame() int {
    elapsed := time.Since(audioStartTime).Seconds() + audioOffset
    frame := int(elapsed * videoFPS)
    return frame
}
```

Each batch response includes current sync frame. Client compares to where it thinks it is and adjusts:

```lua
local correction = 0
if drift > 5 then correction = 0.15
elseif drift > 2 then correction = 0.05
elseif drift < -5 then correction = -0.15
elseif drift < -2 then correction = -0.05
end

local rate = (videoFPS / 60) * (1 + correction)
frameAccum = frameAccum + rate
playFrame = math.floor(frameAccum)
```

Behind? Speed up. Ahead? Slow down. Keeps sync without big frame jumps.

---

## Step 8: The Drawing Problem

Got decoded frames in memory. Now how do I actually display them?

I can't set pixels efficiently. But I can draw filled rectangles. So I convert each frame to horizontal runs of same-colored pixels. (I originally tried a 2D rectangle optimization algorithm but it was slower than just drawing more rectangles, turns out Stormworks draws rectangles faster than I can figure out the optimal way to minimize them.)

```lua
function toRects(frameData)
    local pix = frameData.pix
    local fw = frameData.w
    local fh = frameData.h

    local n = 0
    local idx = 1

    for y = 0, fh - 1 do
        local x = 0
        while x < fw do
            local c = pix[idx] or 0
            local sx = x
            while x < fw and (pix[idx] or 0) == c do
                x = x + 1
                idx = idx + 1
            end
            n = n + 1
            local r = rects[n]
            r[1] = sx      -- x
            r[2] = y       -- y
            r[3] = x - sx  -- width
            r[4] = 1       -- height
            r[5] = c       -- color index
        end
    end

    numRects = n
end
```

Then in `onDraw()`:

```lua
function onDraw()
    for i = 1, numRects do
        local rt = rects[i]
        local c = palette[rt[5] + 1]
        screen.setColor(c[1], c[2], c[3])
        screen.drawRectF(rt[1], rt[2], rt[3], rt[4])
    end
end
```

Basically doing RLE at draw time, which makes sense since RLE'd data naturally groups into runs anyway. (Can't really directly render LZ4 tho)

---

## Bug 1: Nothing Appeared

All this code. Ran it. Black screen.

Added debug overlay:

```lua
dbg = "F:" .. playFrame .. " D:" .. drift .. " B:" .. buffer .. " Q:" .. #decodeQueue
screen.drawText(2, 2, dbg)
```

Buffer filling. Frames decoding. But `numRects` was zero.

Problem? Escape encoding wasn't working properly. The null byte thing. Again.

Fixed that. Now I had... corrupted garbage.

---

## Bug 2: Corrupted Frames

Decoded frames looked like abstract art. Wrong colors, wrong positions, patterns that made no sense.

![](https://doc.micr0.dev/uploads/92b1761a-6f25-40fd-8f9a-896d2d4f57c0.png)
![](https://doc.micr0.dev/uploads/2e330fa2-bbd5-49a8-ada8-91501efd49ed.png)
![](https://doc.micr0.dev/uploads/903cfa78-3fc2-4545-b5d0-d14c5a3906f4.png)

More logging. Issue was in escape decoding reading from wrong position after escape sequences so both the pallet and data was getting shifted around where it wasn't supposed to be:

```lua
function readEsc(data, pos)
    local b = string.byte(data, pos)
    if not b then return nil, pos end
    if b == 255 then
        local n = string.byte(data, pos + 1)
        if n == 1 then return 0, pos + 2  -- <-- this needs to be +2
        elseif n == 2 then return 255, pos + 2
        end
        return nil, pos
    end
    return b, pos + 1
end
```

I was returning `pos + 1` instead of `pos + 2` after escape sequences. One byte off. Everything after it misaligned.

Off by one errors my beloved.

---

## Bug 3: Mysterious Freezing

Video playing now! But freezing at certain points. Always the same points. Then catching up with a jerk.

Added miss counter:

```lua
if frames[playFrame] then
    toRects(frames[playFrame])
    missCount = 0
else
    missCount = missCount + 1
end

if missCount > 0 then dbg = dbg .. " M:" .. missCount end
```

Miss counter climbing to 15+ at specific points. Frames missing. But buffer showed plenty of frames. Decode queue empty. Where were frames going?

Server-side logging revealed something I'd completely forgotten:

```
Batch too large (248011 bytes), reducing count to 22
Batch: start=330 count=30 size=124.8KB
```

My server was reducing batch sizes when they exceeded 195KB. _Silently_. Client requested frames 330-359, server sent 330-351, client thought it got 330-359 and requested 360-389.

**Frames 352-359 were never requested.**

And since P-frames depend on previous frames, once you have a gap, all following P-frames in that chain are useless. They XOR against a frame that doesn't exist.

---

## The Fix: Track What You Actually Got

Changed client to track actual frames received:

```lua
function parseBatch(data, startFrame)
    local framesReceived = 0
    for f = 1, fc do
        -- decode frame
        framesReceived = framesReceived + 1
    end

    highestRequested = startFrame + framesReceived - 1
end
```

Helped, but with multiple requests in flight, out-of-order arrivals confused the tracking.

Simpler fix: one request in flight at a time.

```lua
MAX_FLY = 1
```

Slightly slower prefetch, but bulletproof. No more gaps.

---

## Bug 4: Some Batches Were Slow

Most batches: 2-3ms. Some batches: 650ms. At 30fps that's a 20-frame stutter.

Timing logs:

```
Batch: start=1500 count=30 size=175.1KB sync=1341 TTP=647
Batch: start=1500 count=30 size=176.0KB sync=1372 TTP=673
```

Slow batches all hit my "lossy compression" fallback. When a batch was too big, I tried making frames more similar:

```go
func spatialSmooth(frame []byte, passes int) []byte {
    for pass := 0; pass < passes; pass++ {
        for y := 0; y < HEIGHT; y++ {
            for x := 0; x < WIDTH; x++ {
                counts := make(map[byte]int)  // <-- creating a map per pixel
                // ...
            }
        }
    }
}
```

Map allocation for every single pixel. Multiple passes. 46,080 pixels × map allocations × passes = 650ms.

Ripped out spatial smoothing entirely.

---

## The Real Solution: Adaptive Resolution

Instead of lossy compression tricks: if batch is too big, send it at lower resolution.

Server pre-computes frames at multiple resolutions:

```go
var resolutionSizes = [][2]int{
    {288, 160}, // Full
    {230, 128}, // ~1.25x
    {192, 106}, // ~1.5x
    {160, 88},  // ~1.8x
    {144, 80},  // 2x
    {120, 66},  // ~2.4x
    {96, 53},   // 3x
    {72, 40},   // 4x
}
```

Try full resolution first. Too big? Next level down. Keep going until it fits:

```go
func encodeBatch(startFrame, count int) []byte {
    for level := 0; level < len(resolutionSizes); level++ {
        result := encodeBatchAtLevel(startFrame, actualCount, level)
        if len(result) < 190*1024 {
            return result
        }
    }
    // reduce frame count as last resort
}
```

Client receives resolution with each batch, scales rectangles when drawing:

```lua
local scaleX = (SCREEN_W * 256) / fw  -- Fixed-point scaling
local scaleY = (SCREEN_H * 256) / fh

r[1] = (sx * scaleX) / 256
r[2] = (y * scaleY) / 256
r[3] = ((x - sx) * scaleX) / 256
r[4] = scaleY / 256
```

Complex scenes with lots of motion get resolution drop. Simple scenes stay crisp. All automatic.

---

Aaaaaandd... Thats it. It works here is a video of Bad Apple:
<video src="https://micr0.dev/videos/2025-12-04 10-59-29.mp4" width="720" controls><source src="https://micr0.dev/videos/2025-12-04 10-59-29.mp4"></video>

and ofc I also put stormworks inside of stormworks:
<video src="https://micr0.dev/videos/2025-12-04 11-01-44.mp4" width="720" controls><source src="https://micr0.dev/videos/2025-12-04 11-01-44.mp4"></video>

And here is an absolute stress test of it:
<video src="https://micr0.dev/videos/2025-12-04 11-32-13.mp4" width="720" controls><source src="https://micr0.dev/videos/2025-12-04 11-32-13.mp4"></video>

---

## Was It Worth It?

Finished the project. Watched video play in Stormworks. Immediately thought: _why did I do this?_

It's a boat game. None of this was necessary. Nobody needed video playback in Stormworks.

But you know what? I did it anyway. And now I know way more about video codecs than I ever expected to learn from a game about building rescue helicopters.

Sometimes the dumbest projects will teach you the most.
