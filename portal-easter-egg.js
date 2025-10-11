// portal-easter-egg.js
//
// Fixes in this version:
// 1) Stops the “infinite spin while resting” bug.
//    - True box-vs-viewport collision with contact state (ground/walls/ceiling).
//    - Impulses (bounce + spin torque) only on IMPACT frames (transition into contact).
//    - While in continuous contact, we apply gentle kinetic friction + angular damping so it settles.
// 2) Mirror cube on the correct side of the paired (exit) portal, every frame.
//    - We pick the entry portal dynamically based on which edge the cube is actually nearer to
//      (with along-span check). That naturally “switches” sides after teleport and avoids choosing
//      the wrong side.
// 3) Physics is dt-based (no terminal speed), with light exponential drag for feel.

class Portal2DEasterEgg {
    constructor() {
        this.active = false;
        this.tapCount = 0;
        this.tapTimer = null;

        // Primary cube DOM (the one driven by physics)
        this.pfp = null;
        this.originalPfp = null;

        // Ghost cube DOM (the mirrored view through the other portal)
        this.ghostEl = null;

        // Physics state (dt-based; no max speed)
        this.velocity = { x: 0, y: 0 };     // arbitrary units scaled to pixels via dt*60 (to preserve feel)
        this.position = { x: 0, y: 0 };     // px (center)
        this.rotation = 0;                  // deg
        this.angularVelocity = 0;           // deg / "frame"

        // Tweakables
        this.gravity = 100;                // px/s^2
        this.dragTauSeconds = 12;           // light air drag; does NOT cap speed
        this.angularDragTauSeconds = 18;

        // Collisions & friction
        this.size = 138;                    // visual size (box collider = this box)
        this.restitution = 0.7;             // bounce damping on impacts
        this.contactFriction = 0.15;        // kinetic friction when sliding on a surface
        this.staticStickThreshold = 1;     // if |vy| < this after collision -> stick/snap
        this.angularImpactTorque = 1.0;     // torque impulse scale on *impacts only*
        this.contactAngularDamp = 0.85;     // extra angular damping while in contact (per frame step, scaled)

        // Contact state (to detect impacts and avoid re-impulsing while resting)
        this.onGround = false;
        this.onCeiling = false;
        this.onLeftWall = false;
        this.onRightWall = false;

        // Portals
        this.portals = { blue: null, orange: null };
        this.portalSize = 150;       // visible length of the glowing line
        this.portalThickness = 8;    // line thickness
        this.portalEdgeHitPad = 10;  // endpoint pad for “corner” bumps

        // Teleport control
        this.teleportCooldownFrames = 6;
        this.cooldownCounter = 0;

        // Mirror selection (we recompute per-frame, but keep previous as tie-breaker)
        this.entryPortalType = null; // 'blue' | 'orange' | null

        // Timebase
        this.lastTs = null;
        this.maxStep = 1 / 60;

        this.init();
    }

    // ---------- BOOTSTRAP ----------
    init() {
        const pfpSelectors = [
            '.terminal-pfp',
            'img[alt*="Profile"]',
            'img[alt*="pfp"]',
            'img[alt*="micr0"]'
        ];

        pfpSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                el.style.cursor = 'pointer';
                el.addEventListener('click', this.handleTap.bind(this));
            });
        });

        this.injectStyles();
        window.addEventListener('resize', () => {
            for (const type of ['blue','orange']) {
                const p = this.portals[type];
                if (!p) continue;
                p.position = this.clampPortalPosition(p.edge, p.position);
                this.layoutPortalElement(p);
            }
        });
    }

    handleTap(e) {
        e.preventDefault();
        e.stopPropagation();

        this.tapCount++;
        if (this.tapTimer) clearTimeout(this.tapTimer);
        this.tapTimer = setTimeout(() => this.tapCount = 0, 500);

        if (this.tapCount === 3) {
            this.activate(e.target);
            this.tapCount = 0;
        }
    }

    activate(targetPfp) {
        if (this.active) return;

        this.active = true;
        this.originalPfp = targetPfp;

        // Create physics-enabled primary cube
        this.createPhysicsPfp();

        // Create ghost cube
        this.ghostEl = document.createElement('div');
        this.ghostEl.className = 'physics-pfp ghost';
        const gi = document.createElement('img');
        gi.src = this.originalPfp.src;
        this.ghostEl.appendChild(gi);
        this.ghostEl.style.display = 'none';
        document.body.appendChild(this.ghostEl);

        // Fun hue kick
        this.startHueAnimation();

        // Start physics + inputs
        setTimeout(() => {
            this.startPhysics();
            this.enablePortalShooting();
            this.showInstructions();
        }, 600);
    }

    createPhysicsPfp() {
        const rect = this.originalPfp.getBoundingClientRect();

        this.pfp = document.createElement('div');
        this.pfp.className = 'physics-pfp';

        const img = document.createElement('img');
        img.src = this.originalPfp.src;
        this.pfp.appendChild(img);

        Object.assign(this.pfp.style, {
            position: 'fixed',
            width: `${this.size}px`,
            height: `${this.size}px`,
            left: `${rect.left + rect.width/2 - this.size/2}px`,
            top: `${rect.top + rect.height/2 - this.size/2}px`,
            zIndex: 10000,          // below portals; edges mask naturally
            pointerEvents: 'none',
        });

        document.body.appendChild(this.pfp);

        this.position = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };

        // Hide original
        this.originalPfp.style.opacity = '0';
    }

    startHueAnimation() {
        let hue = 0;
        const hueInterval = setInterval(() => {
            hue += 10;
            const filter = `hue-rotate(${hue}deg) saturate(1.5)`;
            this.pfp.style.filter = filter;
            if (hue >= 360) clearInterval(hueInterval);
        }, 30);
    }

    // ---------- PHYSICS LOOP ----------
    startPhysics() {
        this.velocity = { x: (Math.random() - 0.5) * 8, y: 2 };
        this.angularVelocity = (Math.random() - 0.5) * 10;
        this.lastTs = null;

        const step = (ts) => {
            if (!this.active) return;
            if (this.lastTs == null) this.lastTs = ts;
            let dt = (ts - this.lastTs) / 1000;
            this.lastTs = ts;

            // Clamp and substep to avoid tunneling / huge steps after tab sleep
            dt = Math.min(dt, 0.05);
            while (dt > 0) {
                const h = Math.min(this.maxStep, dt);
                this.updatePhysics(h);
                dt -= h;
            }
            requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }

    updatePhysics(dt) {
        if (!this.pfp) return;

        // Clear contact flags (we'll set them during collision phase)
        const prevGround = this.onGround;
        const prevCeil = this.onCeiling;
        const prevLeft = this.onLeftWall;
        const prevRight = this.onRightWall;
        this.onGround = this.onCeiling = this.onLeftWall = this.onRightWall = false;

        // Apply forces
        this.velocity.y += this.gravity * dt;

        // Light exponential air drag
        const velDamp = Math.exp(-dt / this.dragTauSeconds);
        const angDamp = Math.exp(-dt / this.angularDragTauSeconds);
        this.velocity.x *= velDamp;
        this.velocity.y *= velDamp;
        this.angularVelocity *= angDamp;

        // Integrate (dt*60 keeps original per-frame-ish feel)
        this.position.x += this.velocity.x * dt * 60;
        this.position.y += this.velocity.y * dt * 60;
        this.rotation   += this.angularVelocity * dt * 60;

        // Collide/Teleport (box)
        this.resolvePortalsAndWalls(prevGround, prevCeil, prevLeft, prevRight);

        // Primary cube placement
        this.pfp.style.left = `${this.position.x - this.size/2}px`;
        this.pfp.style.top  = `${this.position.y - this.size/2}px`;
        this.pfp.style.transform = `rotate(${this.rotation}deg)`;

        // Ghost (mirror) update
        this.updateGhostMirror();

        if (this.cooldownCounter > 0) this.cooldownCounter--;
    }

    // ---------- COLLISION + TELEPORT (BOX + contact-state impacts) ----------
    resolvePortalsAndWalls(prevGround, prevCeil, prevLeft, prevRight) {
        // Axis-aligned BOX collider against viewport edges
        const half = this.size / 2;
        const margin = 5;
        const xMin = margin + half;
        const xMax = window.innerWidth - margin - half;
        const yMin = margin + half;
        const yMax = window.innerHeight - margin - half;

        const coversCoord = (portal, coord) => {
            if (!portal) return false;
            const start = portal.position - this.portalSize/2;
            const end   = portal.position + this.portalSize/2;
            return coord >= start && coord <= end;
        };

        const nearEnd = (portal, coord) => {
            if (!portal) return false;
            const start = portal.position - this.portalSize/2;
            const end   = portal.position + this.portalSize/2;
            return Math.abs(coord - start) <= this.portalEdgeHitPad ||
                   Math.abs(coord - end)   <= this.portalEdgeHitPad;
        };

        const tryTeleport = () => {
            if (this.cooldownCounter > 0) return false;

            // LEFT entry
            const pL = this.getPortalAtEdge('left');
            if (pL && this.position.x - half <= margin && coversCoord(pL, this.position.y) && this.velocity.x < 0) {
                return this.performTeleport(pL);
            }

            // RIGHT entry
            const pR = this.getPortalAtEdge('right');
            if (pR && this.position.x + half >= window.innerWidth - margin && coversCoord(pR, this.position.y) && this.velocity.x > 0) {
                return this.performTeleport(pR);
            }

            // TOP entry
            const pT = this.getPortalAtEdge('top');
            if (pT && this.position.y - half <= margin && coversCoord(pT, this.position.x) && this.velocity.y < 0) {
                return this.performTeleport(pT);
            }

            // BOTTOM entry
            const pB = this.getPortalAtEdge('bottom');
            if (pB && this.position.y + half >= window.innerHeight - margin && coversCoord(pB, this.position.x) && this.velocity.y > 0) {
                return this.performTeleport(pB);
            }
            return false;
        };

        if (tryTeleport()) return;

        // IMPACT tracking helpers
        const impact = { ground: false, ceil: false, left: false, right: false };

        // LEFT wall
        if (this.position.x - half <= margin) {
            const portal = this.getPortalAtEdge('left');
            if (!portal || !coversCoord(portal, this.position.y)) {
                this.position.x = xMin;
                if (!prevLeft) {
                    // impact only once when entering contact
                    this.velocity.x = Math.abs(this.velocity.x) * this.restitution;
                    impact.left = true;
                } else {
                    // in continuous contact: apply kinetic friction & angular damping
                    this.velocity.x = Math.max(this.velocity.x, 0); // prevent sinking back in
                    this.velocity.y *= (1 - this.contactFriction * 0.5);
                    this.angularVelocity *= this.contactAngularDamp;
                }
                this.onLeftWall = true;
            } else if (nearEnd(portal, this.position.y)) {
                // Corner-ish bump near a portal endpoint
                this.position.x = xMin;
                if (!prevLeft) {
                    this.velocity.x = Math.abs(this.velocity.x) * this.restitution;
                    impact.left = true;
                } else {
                    this.angularVelocity *= this.contactAngularDamp;
                }
                this.onLeftWall = true;
            }
        }

        // RIGHT wall
        if (this.position.x + half >= window.innerWidth - margin) {
            const portal = this.getPortalAtEdge('right');
            if (!portal || !coversCoord(portal, this.position.y)) {
                this.position.x = xMax;
                if (!prevRight) {
                    this.velocity.x = -Math.abs(this.velocity.x) * this.restitution;
                    impact.right = true;
                } else {
                    this.velocity.x = Math.min(this.velocity.x, 0);
                    this.velocity.y *= (1 - this.contactFriction * 0.5);
                    this.angularVelocity *= this.contactAngularDamp;
                }
                this.onRightWall = true;
            } else if (nearEnd(portal, this.position.y)) {
                this.position.x = xMax;
                if (!prevRight) {
                    this.velocity.x = -Math.abs(this.velocity.x) * this.restitution;
                    impact.right = true;
                } else {
                    this.angularVelocity *= this.contactAngularDamp;
                }
                this.onRightWall = true;
            }
        }

        // TOP wall (ceiling)
        if (this.position.y - half <= margin) {
            const portal = this.getPortalAtEdge('top');
            if (!portal || !coversCoord(portal, this.position.x)) {
                this.position.y = yMin;
                if (!prevCeil) {
                    this.velocity.y = Math.abs(this.velocity.y) * this.restitution;
                    impact.ceil = true;
                } else {
                    this.velocity.y = Math.max(this.velocity.y, 0);
                    this.velocity.x *= (1 - this.contactFriction * 0.5);
                    this.angularVelocity *= this.contactAngularDamp;
                }
                this.onCeiling = true;
            } else if (nearEnd(portal, this.position.x)) {
                this.position.y = yMin;
                if (!prevCeil) {
                    this.velocity.y = Math.abs(this.velocity.y) * this.restitution;
                    impact.ceil = true;
                } else {
                    this.angularVelocity *= this.contactAngularDamp;
                }
                this.onCeiling = true;
            }
        }

        // BOTTOM wall (ground)
        if (this.position.y + half >= window.innerHeight - margin) {
            const portal = this.getPortalAtEdge('bottom');
            if (!portal || !coversCoord(portal, this.position.x)) {
                this.position.y = yMax;

                if (!prevGround) {
                    // Impact: bounce once
                    this.velocity.y = -Math.abs(this.velocity.y) * this.restitution;
                    impact.ground = true;
                } else {
                    // Continuous ground contact:
                    // - Stop downward drift
                    this.velocity.y = Math.min(this.velocity.y, 0);
                    // - Apply kinetic friction along surface
                    this.velocity.x *= (1 - this.contactFriction);
                    // - Heavier angular damping to settle (prevents runaway spin)
                    this.angularVelocity *= this.contactAngularDamp;
                }

                // If nearly at rest vertically, snap and stick (no jitter, no spin gain)
                if (Math.abs(this.velocity.y) < this.staticStickThreshold) {
                    this.velocity.y = 0;
                }

                this.onGround = true;
            } else if (nearEnd(portal, this.position.x)) {
                this.position.y = yMax;
                if (!prevGround) {
                    this.velocity.y = -Math.abs(this.velocity.y) * this.restitution;
                    impact.ground = true;
                } else {
                    this.velocity.x *= (1 - this.contactFriction * 0.5);
                    this.angularVelocity *= this.contactAngularDamp;
                }
                if (Math.abs(this.velocity.y) < this.staticStickThreshold) {
                    this.velocity.y = 0;
                }
                this.onGround = true;
            }
        }

        // Apply spin impulses ONLY on fresh impacts (no repeated torque while resting)
        if (impact.left && !prevLeft) {
            // Torque sign derived from tangential velocity
            this.angularVelocity += (Math.sign(this.velocity.y) || 1) * this.angularImpactTorque;
        }
        if (impact.right && !prevRight) {
            this.angularVelocity += (Math.sign(this.velocity.y) || 1) * this.angularImpactTorque;
        }
        if (impact.ceil && !prevCeil) {
            this.angularVelocity += (Math.sign(this.velocity.x) || 1) * this.angularImpactTorque;
        }
        if (impact.ground && !prevGround) {
            this.angularVelocity += (Math.sign(this.velocity.x) || 1) * this.angularImpactTorque;
        }
    }

    performTeleport(entryPortal) {
        // Need exit portal
        const otherType = entryPortal.type === 'blue' ? 'orange' : 'blue';
        const exitPortal = this.portals[otherType];
        if (!exitPortal) return false;

        const eps = 2; // tiny offset inside from boundary after exiting
        const half = this.size / 2;

        // Where we hit along the entry line
        let along = (entryPortal.edge === 'left' || entryPortal.edge === 'right')
          ? this.position.y
          : this.position.x;

        // Clamp to exit portal span
        const exitStart = exitPortal.position - this.portalSize/2;
        const exitEnd   = exitPortal.position + this.portalSize/2;
        const exitAlong = Math.max(exitStart, Math.min(exitEnd, along));

        // Place just inside at the exit side
        switch (exitPortal.edge) {
            case 'left':
                this.position.x = half + eps;
                this.position.y = exitAlong;
                break;
            case 'right':
                this.position.x = window.innerWidth - half - eps;
                this.position.y = exitAlong;
                break;
            case 'top':
                this.position.y = half + eps;
                this.position.x = exitAlong;
                break;
            case 'bottom':
                this.position.y = window.innerHeight - half - eps;
                this.position.x = exitAlong;
                break;
        }

        // Reorient velocity out of exit side, keep speed
        const speed = Math.hypot(this.velocity.x, this.velocity.y);
        const outSpeed = Math.max(speed, 12);
        switch (exitPortal.edge) {
            case 'left':   this.velocity.x = +outSpeed; break;
            case 'right':  this.velocity.x = -outSpeed; break;
            case 'top':    this.velocity.y = +outSpeed; break;
            case 'bottom': this.velocity.y = -outSpeed; break;
        }

        // Avoid ping-ponging immediately
        this.cooldownCounter = this.teleportCooldownFrames;

        // Nudge entry selector to the new side; per-frame logic will confirm
        this.entryPortalType = otherType;

        return true;
    }

    getPortalAtEdge(edge) {
        for (let type of ['blue', 'orange']) {
            const portal = this.portals[type];
            if (portal && portal.edge === edge) return portal;
        }
        return null;
    }

    // ---------- INPUTS ----------
    enablePortalShooting() {
        // Left click - blue portal
        document.addEventListener('click', this.shootPortal.bind(this, 'blue'));

        // Right click - orange portal
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.shootPortal('orange', e);
        });

        // Keyboard controls
        document.addEventListener('keydown', this.handleKeyPress.bind(this));
    }

    handleKeyPress(e) {
        if (!this.active) return;
        if (e.key === 'Escape') this.deactivate();
    }

    shootPortal(type, e) {
        if (!this.active) return;
        if (e) e.preventDefault();

        // Calculate shot angle
        const mouseX = e ? e.clientX : window.innerWidth / 2;
        const mouseY = e ? e.clientY : window.innerHeight / 2;
        const angle = Math.atan2(mouseY - this.position.y, mouseX - this.position.x);

        // Determine edge + continuous position along that edge
        const edge = this.calculateNearestEdge(angle);
        const pos  = this.calculatePortalPosition(edge, angle);
        const clamped = this.clampPortalPosition(edge, pos);

        // Remove old portal of same type
        if (this.portals[type]) this.portals[type].element.remove();

        // Create new portal line
        this.createPortal(edge, clamped, type);

        // Visual shot
        this.shootProjectile(type, angle);
    }

    calculateNearestEdge(angle) {
        const absX = Math.abs(Math.cos(angle));
        const absY = Math.abs(Math.sin(angle));
        if (absX > absY) return Math.cos(angle) > 0 ? 'right' : 'left';
        return Math.sin(angle) > 0 ? 'bottom' : 'top';
    }

    calculatePortalPosition(edge, angle) {
        switch (edge) {
            case 'left':
                return this.position.y - Math.tan(angle) * this.position.x;
            case 'right':
                return this.position.y + Math.tan(angle) * (window.innerWidth - this.position.x);
            case 'top':
                return this.position.x - this.position.y / Math.tan(angle);
            case 'bottom':
                return this.position.x + (window.innerHeight - this.position.y) / Math.tan(angle);
        }
    }

    clampPortalPosition(edge, position) {
        const margin = this.portalSize / 2 + 2;
        switch (edge) {
            case 'left':
            case 'right':
                return Math.max(margin, Math.min(window.innerHeight - margin, position));
            case 'top':
            case 'bottom':
                return Math.max(margin, Math.min(window.innerWidth - margin, position));
        }
    }

    // ---------- PORTALS ----------
    createPortal(edge, position, type) {
        const el = document.createElement('div');
        el.className = `portal-line portal-${type} portal-${edge}`;

        const portal = { element: el, edge, position, type };
        this.layoutPortalElement(portal);
        document.body.appendChild(el);
        this.portals[type] = portal;
    }

    layoutPortalElement(portal) {
        const el = portal.element;
        const len = `${this.portalSize}px`;
        const thick = `${this.portalThickness}px`;

        el.style.cssText = '';
        el.className = `portal-line portal-${portal.type} portal-${portal.edge}`;
        el.style.position = 'fixed';
        el.style.zIndex = 10002; // above cubes, masks naturally
        el.style.pointerEvents = 'none';

        if (portal.edge === 'left' || portal.edge === 'right') {
            el.style.width = thick;
            el.style.height = len;
            el.style.top = `${portal.position - this.portalSize/2}px`;
            if (portal.edge === 'left') el.style.left = '0';
            else el.style.right = '0';
        } else {
            el.style.height = thick;
            el.style.width = len;
            el.style.left = `${portal.position - this.portalSize/2}px`;
            if (portal.edge === 'top') el.style.top = '0';
            else el.style.bottom = '0';
        }
    }
    updateGhostMirror() {
        const blue = this.portals.blue;
        const orange = this.portals.orange;
    
        // Need both portals and a ghost element
        if (!blue || !orange || !this.ghostEl) {
            if (this.ghostEl) this.ghostEl.style.display = 'none';
            return;
        }
    
        const half = this.size / 2;
        const W = window.innerWidth, H = window.innerHeight;
    
        // Signed depth from a portal's edge to the cube's NEAR face.
        // Positive = inside the room (not through the plane yet)
        // Negative = penetrated past the plane (i.e., some of the cube is through)
        // along = coordinate along the portal line (y for vertical edges, x for horizontal)
        const signedDepthAndAlong = (p) => {
            switch (p.edge) {
                case 'left':   return { depth: (this.position.x - half),          along: this.position.y };
                case 'right':  return { depth: ((W - half) - this.position.x),    along: this.position.y };
                case 'top':    return { depth: (this.position.y - half),          along: this.position.x };
                case 'bottom': return { depth: ((H - half) - this.position.y),    along: this.position.x };
            }
        };
    
        const spanStart = (p) => p.position - this.portalSize / 2;
        const spanEnd   = (p) => p.position + this.portalSize / 2;
        const inSpan    = (p, a) => a >= spanStart(p) && a <= spanEnd(p);
    
        const b = signedDepthAndAlong(blue);
        const o = signedDepthAndAlong(orange);
        const bIn = inSpan(blue, b.along);
        const oIn = inSpan(orange, o.along);
    
        // We only show the ghost when the cube has actually penetrated a portal plane:
        // i.e., signed depth < 0 for that portal AND the cube projects onto that portal's span.
        const candidates = [];
        if (bIn && b.depth < 0) candidates.push({ type: 'blue',  portal: blue,  d: b });
        if (oIn && o.depth < 0) candidates.push({ type: 'orange', portal: orange, d: o });
    
        if (candidates.length === 0) {
            // Not through either portal yet → ghost must be hidden (it should be "behind"/invisible).
            this.ghostEl.style.display = 'none';
            return;
        }
    
        // If penetrating both (corner cases), choose the one with greater penetration (more negative depth).
        candidates.sort((a, b) => a.d.depth - b.d.depth); // more negative first
        let entryType = candidates[0].type;
        // prefer previous selection to avoid flicker when depths are nearly equal
        if (candidates.length > 1 && Math.abs(candidates[0].d.depth - candidates[1].d.depth) < 1) {
            if (this.entryPortalType === candidates[1].type) entryType = candidates[1].type;
        }
        this.entryPortalType = entryType;
    
        const entry = entryType === 'blue' ? blue : orange;
        const exit  = entryType === 'blue' ? orange : blue;
        const d     = entryType === 'blue' ? b : o; // signed depth + along on the ENTRY portal
    
        // Map the ALONG coordinate by normalized fraction of the entry span to the exit span
        const eS = spanStart(entry), eE = spanEnd(entry);
        const xS = spanStart(exit),  xE = spanEnd(exit);
        const spanLenEntry = Math.max(1, eE - eS);
        const t = (Math.min(Math.max(d.along, eS), eE) - eS) / spanLenEntry; // 0..1
        const exitAlong = xS + t * (xE - xS);
    
        // Penetration amount (how far the near face has crossed), always >= 0
        const penetration = -d.depth;
    
        // Place the ghost on the EXIT side such that it is BEHIND the exit wall until penetration > 0.
        // That means the ghost's near face distance from the exit plane equals `penetration`.
        // Convert "near-face distance" back to center coordinates for each edge:
        let gx = this.position.x, gy = this.position.y;
        switch (exit.edge) {
            case 'left':   // near face x = 0 + penetration  => center = half + penetration
                gx = half + penetration;
                gy = exitAlong;
                break;
            case 'right':  // near face x = W - penetration  => center = (W - half) - penetration
                gx = (W - half) - penetration;
                gy = exitAlong;
                break;
            case 'top':    // near face y = 0 + penetration  => center = half + penetration
                gy = half + penetration;
                gx = exitAlong;
                break;
            case 'bottom': // near face y = H - penetration  => center = (H - half) - penetration
                gy = (H - half) - penetration;
                gx = exitAlong;
                break;
        }
    
        // Draw the ghost (portals are above it in z-index, so the edge will mask it correctly)
        this.ghostEl.style.display = 'block';
        this.ghostEl.style.left = `${gx + half}px`;
        this.ghostEl.style.top  = `${gy + half}px`;
        this.ghostEl.style.transform = `rotate(${this.rotation}deg)`;
    }
    

    // ---------- UI ----------
    showInstructions() {
        const instructions = document.createElement('div');
        instructions.className = 'portal-instructions';
        instructions.innerHTML = `
            <h3>🌀 Portal Mode Active</h3>
            <p>Left Click: Blue portal</p>
            <p>Right Click: Orange portal</p>
            <p>Realtime mirror renders on the paired exit</p>
            <p>ESC: Exit</p>
        `;
        document.body.appendChild(instructions);
        setTimeout(() => {
            instructions.style.opacity = '0';
            setTimeout(() => instructions.remove(), 500);
        }, 4500);
    }

    deactivate() {
        this.active = false;

        if (this.pfp) this.pfp.remove();
        if (this.ghostEl) this.ghostEl.remove();
        if (this.originalPfp) this.originalPfp.style.opacity = '1';

        // Clear portals
        Object.values(this.portals).forEach(p => p && p.element && p.element.remove());
        this.portals = { blue: null, orange: null };
        this.entryPortalType = null;

        // Remove instructions
        document.querySelectorAll('.portal-instructions').forEach(el => el.remove());
    }

    // ---------- PROJECTILES (visual sugar) ----------
    shootProjectile(type, angle) {
        const projectile = document.createElement('div');
        projectile.className = `portal-projectile portal-projectile-${type}`;
        projectile.style.left = `${this.position.x}px`;
        projectile.style.top = `${this.position.y}px`;
        document.body.appendChild(projectile);

        const speed = 20;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        let x = this.position.x;
        let y = this.position.y;

        const animateProjectile = () => {
            x += vx;
            y += vy;
            projectile.style.left = `${x}px`;
            projectile.style.top = `${y}px`;
            if (x <= 0 || x >= window.innerWidth || y <= 0 || y >= window.innerHeight) {
                projectile.remove();
            } else {
                requestAnimationFrame(animateProjectile);
            }
        };
        requestAnimationFrame(animateProjectile);
    }

    // ---------- HELPERS ----------
    pickLikelyEntryPortal() {
        // Kept for completeness; dynamic selection now prefers actual span+depth each frame.
        const half = this.size / 2;
        const W = window.innerWidth, H = window.innerHeight;

        const depthTo = (p) => {
            switch (p.edge) {
                case 'left':   return this.position.x - half;
                case 'right':  return (W - half) - this.position.x;
                case 'top':    return this.position.y - half;
                case 'bottom': return (H - half) - this.position.y;
            }
        };

        const b = this.portals.blue, o = this.portals.orange;
        if (!b && !o) return null;
        if (b && !o) return 'blue';
        if (o && !b) return 'orange';

        const db = depthTo(b);
        const do_ = depthTo(o);
        return db <= do_ ? 'blue' : 'orange';
    }

    // ---------- PORTAL MATH ----------
    calculateNearestEdge(angle) {
        const absX = Math.abs(Math.cos(angle));
        const absY = Math.abs(Math.sin(angle));
        if (absX > absY) return Math.cos(angle) > 0 ? 'right' : 'left';
        return Math.sin(angle) > 0 ? 'bottom' : 'top';
    }

    calculatePortalPosition(edge, angle) {
        switch (edge) {
            case 'left':
                return this.position.y - Math.tan(angle) * this.position.x;
            case 'right':
                return this.position.y + Math.tan(angle) * (window.innerWidth - this.position.x);
            case 'top':
                return this.position.x - this.position.y / Math.tan(angle);
            case 'bottom':
                return this.position.x + (window.innerHeight - this.position.y) / Math.tan(angle);
        }
    }

    clampPortalPosition(edge, position) {
        const margin = this.portalSize / 2 + 2;
        switch (edge) {
            case 'left':
            case 'right':
                return Math.max(margin, Math.min(window.innerHeight - margin, position));
            case 'top':
            case 'bottom':
                return Math.max(margin, Math.min(window.innerWidth - margin, position));
        }
    }

    // ---------- STYLE ----------
    injectStyles() {
        const styles = `
            .physics-pfp {
                position: fixed;
                width: ${this.size}px;
                height: ${this.size}px;
                border-radius: 18px !important; /* rounded cube look */
                overflow: hidden;
                will-change: transform, left, top;
                z-index: 10000; /* under portals so the edge masks them */
                pointer-events: none;
                box-shadow:
                    0 6px 14px rgba(0,0,0,0.25),
                    inset 0 0 0 1px rgba(255,255,255,0.06);
                background: #111;
            }
            .physics-pfp img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                border-radius: 18px !important;
                user-select: none;
                -webkit-user-drag: none;
            }
            .physics-pfp.ghost {
                opacity: 1; /* exact mirror, identical look */
                filter: none;
            }

            /* Thin glowing portal lines */
            .portal-line {
                pointer-events: none;
                border-radius: 999px;
                filter: saturate(1.2);
                z-index: 10002; /* above cubes so the edge masks them */
            }

            .portal-blue {
                background: rgba(33,150,243,0.95);
                box-shadow:
                    0 0 10px rgba(33,150,243,0.9),
                    0 0 20px rgba(33,150,243,0.7),
                    0 0 40px rgba(33,150,243,0.55),
                    0 0 80px rgba(33,150,243,0.35);
            }
            .portal-orange {
                background: rgba(255,152,0,0.95);
                box-shadow:
                    0 0 10px rgba(255,152,0,0.9),
                    0 0 20px rgba(255,152,0,0.7),
                    0 0 40px rgba(255,152,0,0.55),
                    0 0 80px rgba(255,152,0,0.35);
            }

            .portal-projectile {
                position: fixed;
                width: 10px; height: 10px;
                border-radius: 50%;
                z-index: 10001;
                transform: translate(-50%, -50%);
                pointer-events: none;
            }
            .portal-projectile-blue {
                background: radial-gradient(circle, #2196F3, transparent);
                box-shadow: 0 0 20px rgba(33,150,243,1);
            }
            .portal-projectile-orange {
                background: radial-gradient(circle, #FF9800, transparent);
                box-shadow: 0 0 20px rgba(255,152,0,1);
            }

            .portal-instructions {
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 16px 18px;
                border-radius: 10px;
                z-index: 10003;
                font-family: 'JetBrains Mono', monospace;
                transition: opacity 0.5s;
                pointer-events: none;
                border: 1px solid rgba(255,255,255,0.12);
                box-shadow: 0 4px 18px rgba(0,0,0,0.35);
            }
            .portal-instructions h3 {
                margin: 0 0 8px 0;
                color: #cfe8ff;
                font-size: 16px;
                letter-spacing: .2px;
            }
            .portal-instructions p {
                margin: 4px 0;
                font-size: 13px;
                opacity: .9;
            }
        `;
        const styleSheet = document.getElementById('portal-styles') || document.createElement('style');
        styleSheet.id = 'portal-styles';
        styleSheet.textContent = styles;
        if (!document.getElementById('portal-styles')) {
            document.head.appendChild(styleSheet);
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.portalEasterEgg = new Portal2DEasterEgg();
    });
} else {
    window.portalEasterEgg = new Portal2DEasterEgg();
}
