# Demo plan

The hardest problem in demoing a website monitor is that websites do not change on cue. Solve it in advance.

## The demo target

Build `/demo/job-board` inside your own app: a page styled like a real careers listing, showing

> **Software Engineer Intern — Summer 2026**
> Applications are currently **closed**. Check back soon.

with a hidden admin control (a query param like `?admin=1`, or a second route) that flips the text to **Apply Now — Applications Open**.

You now own a website that changes exactly when you press a button. This is not cheating — it is the only way to show a 5-minute polling loop inside a 3-minute demo, and every monitoring product demo works this way.

## The script (3 minutes)

1. **0:00 — The problem, in one sentence.** "You're waiting on an internship posting to open. You have no idea when. So you refresh the page fifteen times a day and hope you're not asleep when it happens."
2. **0:20 — Create the watch.** Paste the demo job board URL. Type the condition in plain English: *"tell me when applications open."* Show the live preview of the extracted text — this proves you're reading the real page, not faking it.
3. **0:50 — Show the dashboard.** Seeded history: a watch that has run 300 times, last checked 12 seconds ago. It looks like it has been running for days.
4. **1:20 — Flip the page.** Second browser tab, hit the admin toggle. Applications open.
5. **1:35 — The alert lands.** Have a phone or a second window with the inbox open. The email arrives with the matched sentence and a link.
6. **2:00 — Open the timeline.** Show the diff: red line removed, green line added, and the model's one-sentence verdict with its evidence.
7. **2:20 — The architecture point.** "We hash every page first, so 95% of checks cost zero tokens. The AI only ever sees the diff — that's what makes it cheap enough to run every minute. We also respect robots.txt and block internal-network URLs so this can't be turned into a scanner."
8. **2:45 — The close.** "Point it at anything: course registration, ticket drops, restock pages, a landlord's listings page."

## Before you present

- [ ] Public URL works in a **private/incognito window**
- [ ] A fresh account can sign up and create a watch (the judge may try)
- [ ] Demo inbox is open in a separate window, zoomed in, no personal email visible
- [ ] Seeded history is loaded so no view is empty
- [ ] "Check now" button works — never wait on cron in front of judges
- [ ] **2-minute backup screen recording exists and is downloaded locally, not streamed**
- [ ] Laptop charged, notifications silenced, browser zoom at ~125% for projector legibility
- [ ] Both of you can answer: "what happens when the site blocks you?" and "how do you avoid false alarms?"

## Questions judges will ask

- *"How is this different from Visualping / Distill?"* — Natural-language conditions instead of pixel or region diffs, and a cost architecture that lets us check every minute instead of every day.
- *"What stops it spamming me?"* — Warm-up baseline, aggressive normalization of timestamps and counters, a confidence floor, and a per-watch cooldown.
- *"Isn't scraping a legal problem?"* — We read public pages, honor robots.txt, identify our bot in the User-Agent, and throttle per domain.
- *"What does it cost to run?"* — A hash comparison per check, and a ~500-token model call only when the page actually changed.
