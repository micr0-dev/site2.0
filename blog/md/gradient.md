What if social media moderated itself?

I've been thinking about social media a lot lately. Not in the way most people think about it, scrolling, posting, whatever. I mean thinking about the fundamental structure of how these platforms work and why they all seem to fail in their own special ways.

Big tech social media is surveillance. That's not hyperbole, that's just what it is. Every click tracked, every interaction analyzed, every piece of data sold or used to predict your behavior. The algorithm doesn't show you what your friends posted, **it shows you what keeps you scrolling**. What makes you angry. What makes you engage. It's not a social network, it's an attention extraction machine wrapped in the aesthetics of connection.

And then there's the Fediverse. I love the Fediverse, I really do. I have over a thousand followers, I've built things in that ecosystem. But the Fediverse has this fundamental flaw that everyone kind of knows about but doesn't really want to address: instance-based federation creates echo chambers.

Here's how it works. Instances can defederate from other instances. Admins decide, for everyone on their instance, which other parts of the network they will see. And I get it. Moderation is hard. Bad actors exist. But the result is that the network fragments into ideological clusters with hard walls between them. Far-left instances that block anything right of center. Far-right instances that block everyone else. And everyone in between trying to navigate which instance to join based on who they'll be allowed to talk to. (Not even talking about when people get mad at admins for doing this difficult work. most of them for free)

But it's not really decentralized if admins are just smaller versions of Zuckerberg making unilateral decisions about what you can see. It's just *distributed centralization.* and I think that is a fair assessment of the Fediverse.

So I started thinking. What would actually decentralized moderation look like? Not admins making decisions. Not algorithms optimizing for engagement. Not reports and bans and appeals. What if the network just... moderated itself? Based on actual social trust?

I couldn't stop thinking about it. Staying up until 5am (again...) planning and laying it all out. So I worked through it. And I built something. I'm calling it Gradient.

## How it works

The core idea is stupidly simple, which is usually a sign that it might actually work. Everyone in the network has a social position score, from -1 to 1. When the network is created, you start at 0. The first person you follow becomes 1. The first person you block becomes -1. And from this point, now everyone else positions themselves relative to those anchors based on who they're connected to.

When you follow someone, you drift slightly toward their position. When you block someone, you drift away from them. It's smooth, it accounts for the main thing in human connections, nothing is black and white. And over time, the network self-organizes. People who share social circles cluster together. People who are in conflict drift apart.

And here's where it gets interesting: your feed isn't determined by an algorithm trying to maximize engagement or an admin deciding what you're allowed to see. Your feed is literally just: the people close to you in social space. The closer someone is to your position, the more of their content you see. The further away they are, the less you see. It's a gradient, not a wall.

Let me show you what I mean. I built a proof of concept this morning. Its a basic CLI with some basic commands for experimenting and seeing the *idea* in action. But it works. It actually works.

```
> create micr0
✓ User micr0 created
> create facs
✓ User facs created
> create antifa
✓ User antifa created
```

Boom. So we've got three users. They all start around zero because nobody's connected to anyone yet. Now let's create some connections:

```
> follow micr0 antifa
✓ micr0 is now following antifa
> block antifa facs
✓ antifa blocked facs
> block facs antifa
✓ facs blocked antifa
```

Okay so now we have a conflict. antifa and facs mutually blocked each other. Let's see what the network looks like:

```
> list

=== Network Users ===
antifa: 1.000 (following: 0, followers: 1, blocked: 1)
micr0: 0.817 (following: 2, followers: 1, blocked: 0)
facs: -1.000 (following: 0, followers: 0, blocked: 1)
```

Look at what happened. antifa is at 1.000. facs is at -1.000. They're at opposite extremes because they're in direct conflict. And micr0, who follows antifa, is at 0.817 - closer to antifa's side but not fully there.

The network polarized naturally. No admin or algorithm did this. The social dynamics emerged from the connections.

I will add more people and let us see what happens.

```
> create evil facs
✓ evil is now following facs
✓ User evil created
> follow facs evil
✓ facs is now following evil
> block evil antifa
✓ evil blocked antifa

> list

=== Network Users ===
antifa: 1.000 (following: 0, followers: 1, blocked: 1)
micr0: 0.813 (following: 2, followers: 2, blocked: 0)
evil: -0.983 (following: 1, followers: 1, blocked: 1)
facs: -1.000 (following: 1, followers: 1, blocked: 1)
```

evil joined facs's cluster. The system recognized they belong together based on who they follow and block. evil is at -0.983, right next to facs at -1.000. They're in the same social space.

Now lets introduce a center account. This is where this idea really begins to work. 

```
> create center
✓ User center created
> follow center antifa
✓ center is now following antifa
> follow center facs
✓ center is now following facs
> follow center micr0
✓ center is now following micr0
> follow center evil
✓ center is now following evil

[I also added some of my friends to the network]
> list

=== Network Users ===![](https://doc.micr0.dev/uploads/802c7bb7-fc38-4186-ba86-82460458593a.png)

antifa: 1.000 (following: 0, followers: 2, blocked: 1)
micr0: 0.809 (following: 2, followers: 3, blocked: 1)
neil: 0.801 (following: 2, followers: 1, blocked: 1)
firal: 0.667 (following: 1, followers: 3, blocked: 0)
center: 0.227 (following: 6, followers: 0, blocked: 0)
evil: -0.961 (following: 1, followers: 2, blocked: 1)
facs: -1.000 (following: 1, followers: 2, blocked: 1)
```

center is at 0.227. Almost perfectly centered between the two clusters. Because center follows people from both sides, their position naturally settled in the middle. This is a bridge account. Someone who can see both sides without being fully in either camp. Just like how a lot of people are in the real world. (Like it or not)

![](https://doc.micr0.dev/uploads/10fc3629-c508-47c7-ae92-e31e53e54d5c.png)

This is exactly what I wanted. Echo chambers can exist, we need them to be comfortable, but people naturally cluster with those who share their views. And bridges can exist too. The system allows for it without forcing it. Its kinda like a permeable cell wall rather than a solid brick wall caused by defederating instances.

Now let's see what feeds look like. People post some stuff:

```
> post micr0 omg i just joined Gradient its so cool!
> post evil i hate everyone :( except the facs
> post firal i am cleaning my room
> post neil COMMISION ME!!!
> post micr0 go commision neil!!
> post antifa facs must not exist
> post facs antifa must not exist
```

And now let's look at the different users' feeds:

```
> feed micr0
=== Feed for micr0 (risk threshold: 0.80) ===
[6] @antifa: facs must not exist
[5] @micr0: go commision neil!!
[3] @firal: i am cleaning my room
[1] @micr0: omg i just joined Gradient its so cool!
```

micr0 sees antifa's post. They're close enough in social space. But notice what's missing, evil's post doesn't show up. evil is too far away, at -0.961 compared to micr0's 0.809. That's a risk difference of 1.77. It is too distant. It is filtered out naturally, and facs' post doesn't show up either.

Now let's look at facs's feed:

```
> feed facs
=== Feed for facs (risk threshold: 0.80) ===
[7] @facs: antifa must not exist
[2] @evil: i hate everyone :( except the facs
```

facs only sees their own cluster. evil's post shows up because they're close in social space. But nothing from the other side. They're too far away.

center's feed:

```
> feed center
=== Feed for center (risk threshold: 0.80) ===
[5] @micr0 ⚠️  risk: 0.58: go commision neil!!
[4] @neil ⚠️  risk: 0.57: COMMISION ME!!!
[3] @firal: i am cleaning my room
[1] @micr0 ⚠️  risk: 0.58: omg i just joined Gradient its so cool!
```

center sees the moderate posts with risk warnings. Not blocked, just contextualized. "Hey, this person is 0.58 social distance from you. Maybe consider that when reading their takes." But center doesn't see the extremes. antifa at 1.000 and facs at -1.000 are both too far away even for the bridge account.

This is **gradient moderation**. Its not binary. Its not algorithmic manipulation. Its organic filtering based on social proximity. That's what it is.

## Why this works

The whole algorithm is just a few lines of code. For each post, calculate the absolute difference between the viewer's position and the poster's position. That's the risk score. And then you can either sort chronologically or sort posts by risk score. Then display the ones below your threshold. That's it.

```go
func (n *Network) GetFeed(username string, riskThreshold float64) ([]Post, error) {
    for _, post := range n.Posts {
	risk := n.CalculateRiskScore(username, post.AuthorID)

	if risk < riskThreshold {
		visible = append(visible, post)
	}
    }

    // Sort by timestamp (newest first)
    sort.Slice(visible, func(i, j int) bool {
	return visible[i].Timestamp.After(visible[j].Timestamp)
    })

    return visible, nil
}
```

It's so simple it feels like it shouldn't work. But it does. Because it's modeling how social trust actually functions in real life. You trust people close to you. You're skeptical of people far from your social circles. You might hear about what distant groups are saying, but you don't see it constantly in your feed.

The system is self-correcting too. If someone starts being an asshole, people block them. Their position shifts away from the people blocking them. Their content becomes less visible to those social circles. They don't get banned, they become less relevant. And if they change their behavior, if they build connections with people again, their position can shift back. There's redemption built into this system too.

## What about attacks?

I thought about this too. What if someone creates a thousand fake accounts to manipulate the network? 

Here's the thing: every account you invite (and you MUST have an invite to join the network) increases your own risk score slightly. Invite three friends? That's barely noticeable, they're your actual social circle so it cancels out. Invite a thousand bots? Your risk score skyrockets. You become high-risk to everyone in the network, including the accounts you just invited. The attack defeats itself.

And those fake accounts won't have real social connections. They won't be embedded in the network. They'll cluster together in their own little bubble with high risk scores, and nobody will see their content anyway. And they wont be able to follow anyone because the large social distance causes them to require accepting their follow requests.

The system resists manipulation because manipulation requires genuine social connection to be effective, and genuine social connection is expensive and slow to build.

## What's missing

This is a proof of concept. There's so much more that needs to be built:

Real peer-to-peer networking. Right now it's just local, but the goal is true decentralization with this system. Where everyone can contributes storage and CPU to the network. No servers. No single point of failure.

Encryption. Posts should only be readable by people who follow you at the time of posting. No archaeology. No digging up old posts you wrote in a different context for different people. Privacy through temporal cryptography.

Invite system. You can't just create an account. Someone has to invite you. This solves the cold start problem and provides Sybil attack resistance. You inherit some initial social position from whoever invited you.

Follow requests. People who are far from your social circle will only be able to send you a follow request, they won't be able to just follow you and gain access to your encrypted posts.

Tuning. And allowing each individual user to tune their thresholds themselves, this isn't hard but needs to be experimented with, I even had the idea where your tune/thresholds can be inherited from the person who invited you.

aaaand a UI that doesn't suck. The command line is great for proving this concept but its not usable.

But the core works. The algorithm works. The social dynamics work. and the moderation works.

## Why I built this

I've been thinking about Aaron Swartz a lot lately. What happened to him. What he was fighting for. Information freedom. Resistance to centralized control. The idea that systems should serve people, not power.

Aaron died fighting a system that was rigged against him. Prosecutors with too much power. Laws designed to protect institutions, not justice. A world where downloading academic articles could get you labeled a criminal and threatened with decades in prison.

I can't bring him back. But I can build things that make it harder for that to happen again. Infrastructure that can't be controlled by any single entity. Tools that resist surveillance and centralization. Systems where trust emerges from social connections, not authority.

Gradient is my attempt at that. A social network that can't be owned, can't be sold, can't be weaponized against the people using it. Where moderation is organic and trust is decentralized and no admin or algorithm can decide what you're allowed to see.

I don't know if this will work at scale. I don't know if people will actually use it. I don't know if there are problems I haven't thought of yet. But I know the core idea is sound because I built it and it works.

So I'm sharing this. It is incomplete. But the concept is real and I want people to see it. To build it with me if they want.

Because we need alternatives. We need systems that resist control. We need tools that actually serve the people using them.

And maybe, if we're lucky, we can build something that Aaron would have been proud of.

---

The code for the Proof-of-Concept is https://github.com/micr0-dev/Gradient-poc. It's written in Go Lang, it's a weekend project. But it proves the concept works.

For Aaron. For everyone who needs infrastructure that can't be used against them. And for the internet.

---
Micr0byte
2025-10-11
