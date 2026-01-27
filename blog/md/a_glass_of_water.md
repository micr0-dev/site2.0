# a glass of water

A glass of water is what I drink while writing a blog post. Maybe two if I'm stuck on something. It's basically nothing. It's a menial task.

But when AI drinks a glass of water, it's a crisis.

You've seen the headlines. "ChatGPT uses a bottle of water for every 20 questions!" Scary stuff. Bad robot. Planet dying.

But I had a thought last night... When we talk about the water AI uses... we include the water used to train it. The massive data centers. The cooling systems. The whole lifecycle.

So why don't we do the same for humans?

I should note, I'm not asking this to defend AI companies. Trust me, we'll get to how fucked up their practices are. I'm asking because I want to actually answer the question. Fairly. With the same rules for both sides.

So let's do the math.

## The numbers for AI

Let's start with what everyone's mad about. According to Google's own reporting, a single Gemini text prompt uses about **0.24 Wh** of energy and roughly **0.26 mL** of water. OpenAI says ChatGPT uses around **0.34 Wh** per query.

But hold on. Researchers at UC Riverside found that US data centers actually use way more water, somewhere between **10-50 mL per query**, depending on location. Arizona data centers in summer? 30+ mL. Google's numbers are a global average that includes facilities with better cooling.

Let's be fair and say **0.3 Wh** and **10 mL** per email-length response. That's the operational cost of an "AI".

Now training. GPT-3's training used about **1,287 MWh** of energy and evaporated roughly **5.4 million liters** of water. GPT-5 is estimated at 100x bigger. Call it **500,000 MWh** and **540 million liters**.

It is pretty insane. Thats enough to power a small city for a year... But let's do this properly and amortize it.

ChatGPT handles about **1 billion queries per day**. Models get replaced roughly every 6 months (if not sooner), so that's about **182 billion queries** per model lifetime.

Per-query training cost:
- Energy: 500,000,000,000 Wh ÷ 182,000,000,000 queries = **~2.7 Wh**
- Water: 540,000,000,000 mL ÷ 182,000,000,000 queries = **~3 mL**

Training adds almost 10x the operational energy cost per query. But still pretty small in absolute terms.

So in total, for an AI writing one email, we get roughly **3 Wh** of energy and **13-53 mL** of water.

## The numbers for humans

Now let's do the same thing for a human writing an email.

Your brain uses about **20 watts** continuously. That's 20% of your entire body's energy consumption just to keep thinking. Here's something I didn't know until researching this: when you're "thinking hard" like writing an email, your brain only uses about **5-8% more energy** than when you're just sitting there doing nothing. The brain is weirdly flat in its energy demand.

For a 10-minute email, your brain uses about **3.5 Wh**. Your whole body uses around **15 Wh** (about 12-14 calories). You'll drink maybe 25-40 mL of water, though you'd drink that anyway.

So the immediate cost of a human writing an email is about **15 Wh** and **30 mL** of water. Already worse than AI, but not by much...

But wait... We counted AI training, Where's the human training?

### Human training

You weren't born knowing how to write emails. It took roughly 22 years of food, water, housing, and education to produce an 'email-capable' you. (god that sounds capitalistic as hell)

The water footprint of food production, because agriculture uses 92% of humanity's water, comes out to somewhere between **30 and 65 million liters** over those 22 years. That's the water it took to grow the crops, raise the animals, process the food. Everything you ate to become you.

(Vegetarians, you're at the lower end. Beef is absurdly water intensive. But even at half the water footprint, as we shall soon see... you're still using way more than the robot. Sorry.)

Energy is similar. When you account for food production (it takes about 6 calories of fossil fuel energy to produce 1 calorie of food) housing, transportation, education... you're looking at roughly **300,000-460,000 kWh** of embodied energy in one adult human.

Now we amortize. Just like we did with the AI math. How many "emails" does a human write in a lifetime?

Let's say you do about 500 meaningful cognitive tasks per day (emails, decisions, creative work, whatever) over a 43-year working career. That's roughly **8 million email-equivalent tasks**.

Amortized human "training cost" per email:
- Water: 30-65 million liters ÷ 8 million tasks = **4-8 liters**
- Energy: 400,000 kWh ÷ 8 million tasks = **50 Wh**

Add the immediate operational cost, and one human-written email costs roughly **65 Wh** and **4-8 liters** of water.

## The comparison

| | AI | Human |
|--|--|--|
| Energy per email | ~3 Wh | ~65 Wh |
| Water per email | ~13-53 mL | ~4,000-8,000 mL |

Humans use **~20x more energy** and **~100-600x more water** per email than AI.

Vegetarians: Same energy, and ~50-300x more water. Still losing to the robot :/

Wow... Huh.

### But is this comparison fair?

There's a real argument that it isn't.

A human exists whether or not they write an email. You breathe, eat, think, exist. Should we attribute all of that to the email? If you didn't write it, you'd still be alive. Still drinking water.

AI only consumes resources when you query it. No baseline existence cost.

So maybe we should only count marginal costs, the extra resources used specifically for the task. No human development. No AI training. Just the electricity and water consumed in the moment of writing.

| | AI | Human |
|--|--|--|
| Energy per email | ~0.3 Wh | ~15 Wh |
| Water per email | ~10 mL | ~30 mL |

Still a **50x energy difference**. Water becomes close to equal.

Both of these framings are valid. Neither is wrong.

### What this doesn't excuse

None of this math makes AI companies less shitty.

Data centers built in residential areas generating constant noise that ruins lives. Electricity and water costs spiking in regions where these facilities operate. And water pulled from already stressed aquifers during droughts.

And that's before the content these models trained on. Art. Writing. Code. Scraped without consent, without compensation. [I've written about my opinions on Intellectual Property before](https://micr0.dev/blog/html/IP_is_Bullshit.html), they are... complicated, and kinda unique, but the way corporations handled this is extractive in the ugliest sense.

The efficiency of AI doesn't excuse any of that.

## The answer

I started this trying to answer a simple question: who uses more resources to write an email, AI or a human?

And the answer is actually pretty clear.

**If you count training for both:** AI uses ~20x less energy and ~100-600x less water.

**If you only count immediate operational costs:** AI uses ~50x less energy. Water is roughly comparable.

Either way, AI wins. By a lot, or by a little, depending on how you frame it. But it wins.

Make of it what you will.

---

*by micr0*