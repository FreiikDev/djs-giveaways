<br>
<p align="center" style="font-size: 24px;">
  <a href="https://npmjs.com/djs-giveaways/">
    <img height="20" alt="npm" src="https://badgen.net/badge/install/djs-giveaways/red?icon=npm" target="_blank" />
  </a>
  <a href="https://npmjs.com/djs-giveaways/">
    <img height="20" alt="dt" src="https://img.shields.io/npm/dt/djs-giveaways?color=orange" target="_blank" />
  </a>
  <a href="https://github.com/FreiikDev/djs-giveaways/">
    <img height="20" alt="gh" src="https://badgen.net/badge/Freiik/djs-giveaways/yellow?icon=github" target="_blank" />
  </a>
  <a href="https://npmjs.com/djs-giveaways/">
    <img height="20" alt="v" src="https://img.shields.io/npm/v/djs-giveaways?color=green" target="_blank" />
  </a>
  </br>
  </br>
  <b>Make your discord giveaways with this module.</b>
</p>

### Informations

- Can be used on Discord.JS v13 and newer 🤓
- Fully customizable and simple to use _\*(progress bar available)\*_ 😎
- Can `start`, `reroll`, `stop` or `delete` giveaways 🎉
- Special events `giveawayCreated`, `giveawayRerolled`, `giveawayEnded`, `giveawayDeleted` 🫂

### Example of importation

```js
const {Client} = require("discord.js"), // Import Discord.js
    {Manager} = require("djs-giveaways"), // Import Manager from the module djs-giveaways
    client = new Client({intents: 513}), // Start the instance of a Discord Client with GUILDS & GUILDS_MESSAGES intents
    Giveaway = new Manager(client, {
        storage: require("path").join(__dirname, "storage.json"), // Import Storage, you must have a json file with contains a array "[]"
        updateCountdownEvery: 10000 // Not required, the default value is 30000 (ms)
    });

client.on("ready", () => {
    console.log(`${client.user.tag} connected to Discord!`)
});

client.login("token");
```

You can have access to functions like `Giveaway.create(message, data)`, `Giveaway.reroll(id)`, `Giveaway.stop(id)`
, `Giveaway.delete(id)` or `Giveaway.settings()`.

### Class Manager

```js
Giveaway.settings(); // Get internal settings of the module, return object
Giveaway.create(message, {
    time: 1000, prize: "owo discord nitro!", winnerCount: 1, // Time, prize & winnerCount must be present when you call this function. You can customize all the content below, you can even delete these objects: they are automatically added. 
    button: "Participe",
    data: {
        "content": {
            "text": "",
            "participate": "You are now participating in the event!",
            "removeParticipate": "You are no longer participate in the event \:(.",
            "winMessage": "Congratulation {winner}, you won **{prize}**!",
            "noWinner": "Giveaway canceled, nobody has a valid participation."
        },
        "embed": {
            "color": 4375285,
            "author": true,
            "title": "{prize}",
            "footer": {
                "start": "ID: {id}",
                "end": "End | ID: {id}",
                "icon_url": "https://cdn.discordapp.com/emojis/863097061716525056.png"
            },
            "description": {
                "start": "React with the button to participate!\n\nHosted by: {user}.\nTime left: **{duration}** {progressBar}.",
                "end": " Giveaway ended!\n\nWinners: {winner}\nHosted by: {user}."
            },
            "timestamp": message.createdAt
        }
    }
})
Giveaway.reroll(id); // Reroll a giveaway, you can provide the Giveaway ID or the message ID.
Giveaway.stop(id); // Stop a giveaway, you can provide the Giveaway ID or the message ID.
Giveaway.delete(id); // Delete a giveaway, you can provide the Giveaway ID or the message ID.
```

### Credits
- [Mw3y](https://github.com/Mw3y/), for this [Text-ProgressBar](https://github.com/Mw3y/Text-ProgressBar)