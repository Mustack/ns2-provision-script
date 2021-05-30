I made this script to automate creating and destroying a game server on Digital Ocean.

To save some money, I setup the server manually, created a snapshot, and destroyed the droplet. Now, I can create a new droplet when I want to host games and have the script automatically destroy it again after a few hours. It's very easy to do this manually but the reason I wanted this was that I often forget to turn off the server.

This is script is very naive and dirty. I didn't bother to make anything about the script configurable so it makes a lot of assumptions about my situation in particular.
