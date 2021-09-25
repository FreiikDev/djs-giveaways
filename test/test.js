const {Client} = require("discord.js"),
    {Manager} = require("../index"),
    ms = require("ms"), // Install MS `npm i ms`
    {join} = require("path"),
    client = new Client({intents: 513}),
    Giveaway = new Manager(client, {storage: join(__dirname, "/storage.json"), updateCountdownEvery: 2000}),
    prefix = ",";

client.on("ready", () => {
    console.log(`${client.user.tag} connected to Discord!`)
});

client.on("messageCreate", message => {
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.trim().split(/ +/g);
    const cmd = args[0].slice(prefix.length).toLowerCase();

    if (cmd === 'start') Giveaway.create(message, {winnerCount: Number(args[1]), time: ms(args[2]), prize: args.slice(3).join(" ")}).then(c => console.log(c.id))

    // Example with all data that you can edit

    if (cmd === 'start-full') {
        Giveaway.create(message, {
            winnerCount: Number(args[1]),
            time: ms(args[2]),
            prize: args.slice(3).join(" "),
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
        }).then(c => console.log(c.id));
    }

    if (cmd === 'stop') Giveaway.stop(args[1]);
    if (cmd === 'reroll') Giveaway.reroll(args[1]);
    if (cmd === 'delete') Giveaway.delete(args[1]);
})

client.login("token");