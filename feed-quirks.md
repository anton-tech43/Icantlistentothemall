# Feed Quirks — RSS Parser Test Results

**Date:** 2026-04-16
**Agent:** Agent 1 (RSS Monitor & Audio Acquisition)

---

## Summary

| Feed | Episodes | GUID? | GUID Unique? | Duration Format | Audio Location | Bonus/Trailer? | Encoding Issues? |
|---|---|---|---|---|---|---|---|
| Diary of a CEO | 819 | Yes | Yes | seconds | enclosure | Yes (137) | No |
| My First Million | 856 | Yes | Yes | seconds | enclosure | Yes (11) | No |
| The Tim Ferriss Show | 865 | Yes | Yes | HH:MM:SS | enclosure | Yes (4) | No |
| The Game w/ Alex Hormozi | 1000 | Yes | Yes | MM:SS, HH:MM:SS | enclosure | Yes (4) | No |
| Lenny's Podcast | 338 | Yes | Yes | seconds | enclosure | No | No |

## Filter Results

| Feed | Pass Filter | Skipped (Title) | Under 35min | Duration Unknown |
|---|---|---|---|---|
| Diary of a CEO | 544 | 137 | 273 | 0 |
| My First Million | 744 | 11 | 111 | 0 |
| The Tim Ferriss Show | 789 | 4 | 75 | 0 |
| The Game w/ Alex Hormozi | 193 | 4 | 805 | 0 |
| Lenny's Podcast | 336 | 0 | 2 | 0 |

---

## Diary of a CEO

**Feed URL:** `https://rss2.flightcast.com/xmsftuzjjykcmqwolaqn6mdn`
**Feed Title:** The Diary Of A CEO with Steven Bartlett
**Total Episodes in Feed:** 819

### Quirks

- **GUID present:** Yes
- **GUID unique:** Yes (all unique)
- **GUID samples:** `flightcast:01KP9HAYP5R81VSSVBEPE3C926`, `flightcast:01KP1XGY1N8WW1CWHYZVW5VFWH`, `flightcast:01KNSKACDHYJGSTEZE6Y0XKJ2Z`
- **Duration format(s):** seconds
- **Duration missing count:** 0
- **Audio URL location:** enclosure
- **Audio formats:** audio/mpeg
- **Has bonus/trailer episodes:** Yes (137)
  - Examples:
    - "Most Replayed Moment: Your Thoughts Shape Your Reality! How To Rewrite Limiting Beliefs" — episodeType: bonus
    - "Most Replayed Moment: Mouthwash REVERSES The Benefits Of Exercise! Dr Nathan Bryan" — episodeType: bonus
    - "Most Replayed Moment: The Truth About Protein Intake and The Simplest Way To Lose Fat" — episodeType: bonus
    - "Most Replayed Moment: The Direct Path To Purpose And Happiness! These 2 Decisions Matter Most" — episodeType: bonus
    - "Most Replayed Moment: The Antibiotic Alternative Big Pharma Doesn't Want You To Know!" — episodeType: bonus
- **Encoding issues:** No

### 5 Most Recent Episodes

| # | Title | Date | Duration | Audio? | Would Skip? |
|---|---|---|---|---|---|
| 1 | World Collapse Expert (Ian Bremmer): The Real Crisis Is What... | 2026-04-16 | 99m 28s | Yes (enclosure) | No |
| 2 | The Iran War Expert: The Most Dangerous Stage Begins Now | 2026-04-13 | 96m 32s | Yes (enclosure) | No |
| 3 | Most Replayed Moment: Your Thoughts Shape Your Reality! How ... | 2026-04-10 | 19m 41s | Yes (enclosure) | Yes: episodeType: bonus |
| 4 | Ivanka Trump: My Dad Told Me Two Weeks Before He Ran For Pre... | 2026-04-09 | 95m 58s | Yes (enclosure) | No |
| 5 | Financial Crash Expert: In 3 months We’ll Enter A Famine! If... | 2026-04-06 | 93m 36s | Yes (enclosure) | No |

---

## My First Million

**Feed URL:** `https://feeds.megaphone.fm/HS2300184645`
**Feed Title:** My First Million
**Total Episodes in Feed:** 856

### Quirks

- **GUID present:** Yes
- **GUID unique:** Yes (all unique)
- **GUID samples:** `612c71e2-39a1-11f1-a443-0b57f56ee0b0`, `432c42e0-381f-11f1-87b1-efa1177fcd1f`, `5f21ebca-3415-11f1-8462-2bdea5b6951a`
- **Duration format(s):** seconds
- **Duration missing count:** 0
- **Audio URL location:** enclosure
- **Audio formats:** audio/mpeg
- **Has bonus/trailer episodes:** Yes (11)
  - Examples:
    - "Best of MFM: Listen To This Before You Invest Another Dollar" — title contains "best of"
    - "Best of July" — title contains "best of"
    - "Announcement: Marketing Against the Grain" — episodeType: bonus
    - "Best of This Week: March 18th" — title contains "best of"
    - "Best of This Week: March 11th" — title contains "best of"
- **Encoding issues:** No

### 5 Most Recent Episodes

| # | Title | Date | Duration | Audio? | Would Skip? |
|---|---|---|---|---|---|
| 1 | #1 Habit Expert: Here's how you become dramatically better  | 2026-04-16 | 60m 41s | Yes (enclosure) | No |
| 2 | Steph Smith: “This opportunity is totally overlooked” | 2026-04-14 | 41m 36s | Yes (enclosure) | No |
| 3 | Ex-Tesla President reveals EVERYTHING Elon does to win | 2026-04-09 | 64m 37s | Yes (enclosure) | No |
| 4 | We asked a $18.9B Investor how to survive the AI bubble | 2026-04-07 | 65m 43s | Yes (enclosure) | No |
| 5 | The Side Hustle King: "Make $20K+/month without money, luck,... | 2026-04-01 | 55m 33s | Yes (enclosure) | No |

---

## The Tim Ferriss Show

**Feed URL:** `https://rss.art19.com/tim-ferriss-show`
**Feed Title:** The Tim Ferriss Show
**Total Episodes in Feed:** 865

### Quirks

- **GUID present:** Yes
- **GUID unique:** Yes (all unique)
- **GUID samples:** `gid://art19-episode-locator/V0/ddx9Hsmwb0DmDFkJcym08WmvZl5fw9bfQdcdWks2JyQ`, `gid://art19-episode-locator/V0/QJEiMoPw3FhKnfR7ujrx_13N3UBzgjkVse5ic7-3xMk`, `gid://art19-episode-locator/V0/NIRZ9cZaFJTyUZO00RIf8ggYR5fil6wHu0MZ-3jseRo`
- **Duration format(s):** HH:MM:SS
- **Duration missing count:** 0
- **Audio URL location:** enclosure
- **Audio formats:** audio/mpeg
- **Has bonus/trailer episodes:** Yes (4)
  - Examples:
    - "#640: Announcing My New Fiction Podcast Series (Plus: A 50-Second Trailer)" — title contains "trailer"
    - "BONUS: Sam Harris Guided Meditations and Lessons" — title contains "bonus"
    - "Jamie Foxx Mega-Interview - 5-Minute Teaser" — title contains "teaser"
    - "Arnold Schwarzenegger Teaser" — title contains "teaser"
- **Encoding issues:** No

### 5 Most Recent Episodes

| # | Title | Date | Duration | Audio? | Would Skip? |
|---|---|---|---|---|---|
| 1 | #861: 4-Hour Workweek Success Story Brian Dean — From Dad’s ... | 2026-04-16 | 62m 8s | Yes (enclosure) | No |
| 2 | #860: Daredevil Michelle Khare — How to Become a YouTube Sup... | 2026-04-07 | 190m 28s | Yes (enclosure) | No |
| 3 | #859: Q&A with Tim — The Upcoming AI Tsunami and Building Of... | 2026-03-26 | 83m 49s | Yes (enclosure) | No |
| 4 | #858: The Random Show, Couch Edition! — Supplements, Humming... | 2026-03-18 | 96m 41s | Yes (enclosure) | No |
| 5 | #857: How to Simplify Your Life in 2026 — New Tips from Mari... | 2026-03-10 | 42m 54s | Yes (enclosure) | No |

---

## The Game w/ Alex Hormozi

**Feed URL:** `https://feeds.captivate.fm/the-game-alex-hormozi/`
**Feed Title:** The Game with Alex Hormozi
**Total Episodes in Feed:** 1000

### Quirks

- **GUID present:** Yes
- **GUID unique:** Yes (all unique)
- **GUID samples:** `f3d8f3e0-d1e0-441e-babb-28617a3bbb6e`, `7ddb1d82-2d69-46f2-ae7b-3ea401a9eb9d`, `7fd76501-fd50-47d2-8d39-1bb9dc3bf5a7`
- **Duration format(s):** MM:SS, HH:MM:SS
- **Duration missing count:** 0
- **Audio URL location:** enclosure
- **Audio formats:** audio/mpeg
- **Has bonus/trailer episodes:** Yes (4)
  - Examples:
    - "My next book is here: $100M Money Models." — episodeType: bonus
    - "My New Book Is Coming" — episodeType: bonus
    - "Guest Spot on Franchise Secrets" — episodeType: bonus
    - "Alex's Guest Spot On "Dropping Bombs" with Brad Lea" — episodeType: bonus
- **Encoding issues:** No

### 5 Most Recent Episodes

| # | Title | Date | Duration | Audio? | Would Skip? |
|---|---|---|---|---|---|
| 1 | How to Scale an E-Commerce Business Past the $10M Wall | Ep ... | 2026-04-16 | 39m 48s | Yes (enclosure) | No |
| 2 | Embrace The Cringe | Ep 961 | 2026-04-14 | 7m 52s | Yes (enclosure) | No |
| 3 | One Step Away From Collapse (Here’s How We Fixed It) | Ep 96... | 2026-04-09 | 24m 6s | Yes (enclosure) | No |
| 4 | How To Stop Solving Problems That Do Not Exist  | Ep 959 | 2026-04-07 | 33m 18s | Yes (enclosure) | No |
| 5 | How to Grow Your Brand In 2026 | Ep 958 | 2026-04-02 | 38m 26s | Yes (enclosure) | No |

---

## Lenny's Podcast

**Feed URL:** `https://api.substack.com/feed/podcast/10845.rss`
**Feed Title:** Lenny's Podcast: Product | Career | Growth
**Total Episodes in Feed:** 338

### Quirks

- **GUID present:** Yes
- **GUID unique:** Yes (all unique)
- **GUID samples:** `substack:post:193008881`, `substack:post:192660974`, `substack:post:192024618`
- **Duration format(s):** seconds
- **Duration missing count:** 0
- **Audio URL location:** enclosure
- **Audio formats:** audio/mpeg
- **Has bonus/trailer episodes:** No
- **Encoding issues:** No

### 5 Most Recent Episodes

| # | Title | Date | Duration | Audio? | Would Skip? |
|---|---|---|---|---|---|
| 1 | Hard truths about building in the AI era | Keith Rabois (Kho... | 2026-04-12 | 82m 39s | Yes (enclosure) | No |
| 2 | Head of Growth (Anthropic): “Claude is growing itself at thi... | 2026-04-05 | 112m 49s | Yes (enclosure) | No |
| 3 | An AI state of the union: We’ve passed the inflection point,... | 2026-04-02 | 99m 51s | Yes (enclosure) | No |
| 4 | From skeptic to true believer: How OpenClaw changed my life ... | 2026-03-29 | 106m 35s | Yes (enclosure) | No |
| 5 | The art of influence: The single most important skill that A... | 2026-03-22 | 93m 33s | Yes (enclosure) | No |

---

## Issues & Notes

