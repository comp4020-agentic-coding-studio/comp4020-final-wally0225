# Crit 9 reflection

## What was the breakthrough that moved the work forward?

The breakthrough was seeing that the real work sat above the transport. I had named real-time as the risk in week 9, but making the list live over server-sent events took one commit. The hard part was everything after that: what people should see when they use the app at the same moment. What happens to someone choosing an arrival time when another person joins? What does someone see when they unlock their phone an hour later? Should anyone see who else is looking? None of those had a technical answer. Each one had to be judged against what my README says good means, and the answers became four decisions instead of one feature.

## What did this work change about who I want to be as a software developer?

This week showed me that thinking through "might happen" scenarios is what makes a product hard to break. The agent was useful for this: it helped me think of situations I hadn't pictured, like a live update resetting someone's dropdown just before they press Join, or two people taking the last spot while one of them is still choosing. Once a scenario was named, I could decide how the app should behave before any user ran into it. Before, I mostly built what I wanted the app to do. Now I want to put more effort into the cases that might happen, and use the agent to find them, so the problems are prevented before they happen instead of fixed after.
