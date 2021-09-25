let {existsSync, writeFileSync} = require('fs'),
    settings = {interval: []};

module.exports = class Manager {
    constructor(client, data) {
        settings.client = client;
        if(Number(require("discord.js").version.split(".")[0]) < 13) throw new Error("You must use Discord.JS v13 or newer.");
        settings.storage = data.storage ? data.storage : () => new Error("There's no valid storage file in JSON (.json).");
        settings.updateCountdownEvery = data.updateCountdownEvery ? data.updateCountdownEvery : 30000;
        if (!existsSync(settings.storage) || !String(settings.storage).endsWith(".json")) throw new Error("There's no valid storage file in JSON (.json).");
        settings.giveaways = require(settings.storage);

        settings.client.on('interactionCreate', async interaction => {
            if(interaction.user.bot) return;
            let giveaway = settings.giveaways.find(x => x.id === interaction.customId);
            if (interaction.isButton() && giveaway) {
                if (giveaway.participationsID.includes(interaction.user.id)) {
                    await interaction.reply({content: giveaway.data.content.removeParticipate,ephemeral: true})
                }
                else {
                    giveaway.participationsID.push(interaction.user.id);
                    await interaction.reply({content: giveaway.data.content.participate, ephemeral: true})
                    saveStorage();
                }
            }
        });

        settings.client.on("ready", () => {
            settings.giveaways.forEach(giveaway => {
                if (giveaway.ended === true) return;
                const date = giveaway.endAt - Date.now();
                if (date <= 0) end(giveaway);
                edit(giveaway.id);
            });
        })
    }

    settings(){
        return settings;
    }

    create(message, data) {
        return new Promise((resolve, reject) => {
            if (!data.time || !data.prize) return;
            if (!data.winnerCount) data.winnerCount = 1;
            if (!data.channel) data.channel = message.channel.id;
            const id = Math.random().toString(36).toUpperCase().replaceAll(/[0-9O]/g, '').substring(1, 8);
            const content = {
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
                        "end": "Giveaway ended!\n\nWinners: {winner}\nHosted by: {user}."
                    },
                    "timestamp": message.createdAt
                },
                "button": {
                    "type": 1,
                    "components": [
                        {
                            "style": 1,
                            "label": "{button}",
                            "custom_id": "{id}",
                            "disabled": false,
                            "emoji": {"id": null, "name": `🎉`},
                            "type": 2
                        }
                    ]
                }
            };

            if (data.data) {
                for (const [a, b] of Object.entries(content)) {
                    if(data.data[a]){
                        if(typeof data.data[a] === "object"){
                            for(const [c, d] in data.data[a]){
                                content[a] = Object.assign(content[a], data.data[a]);
                            }
                        }else{
                            content[a] = data.data[a];
                        }
                    }
                }
            }
            data.content = content;
            if (data.content.embed.author) data.content.embed.author = {
                name: message.author.tag,
                icon_url: message.author.avatarURL({format: "png", dynamic: true, size: 16})
            }
            else{
                delete data.content.embed.author;
            }

            const json = {
                "id": id,
                "messageID": message.id,
                "channelID": data.channel,
                "guildID": message.guildId,
                "authorID": message.author.id,
                "startAt": Date.now(),
                "endAt": Date.now() + data.time,
                "ended": false,
                "prize": data.prize,
                "winnerCount": data.winnerCount ? data.winnerCount : 1,
                "data": data.content,
                "participationsID": [],
                "winnersID": []
            };

            json.data = JSON.parse(JSON.stringify(json.data).replaceAll("{prize}", json.prize).replaceAll("{user}", `<@${json.authorID}>`).replaceAll("{duration}", `<t:${Math.round(json.endAt / 1000)}:R>`).replaceAll("{id}", id).replaceAll("{button}", data.button ? data.button : "Participate"));
            settings.giveaways.push(json);
            saveStorage();
            edit(json.id);
            settings.client.emit("giveawayStarted", json);
            resolve(json);
        });
    }

    stop(id) {
        const giveaway = settings.giveaways.find(x => x.ended === false && x.id === id || x.messageGiveaway === id);
        if(giveaway) return end(giveaway);
    }

    reroll(id){
        const giveaway = settings.giveaways.find(x => x.ended === true && x.id === id|| x.messageGiveaway === id);
        if(giveaway) return end(giveaway, "roll & roll !");
    }

    delete(id){
        const giveaway = settings.giveaways.find(x => x.id === id || x.messageGiveaway === id);
        if(giveaway) {
            settings.giveaways = settings.giveaways.filter(x => x.id !== id || x.messageGiveaway === id);
            settings.client.emit("giveawayDeleted", giveaway);
            saveStorage();
        }
    }
}

function saveStorage() {
    writeFileSync(settings.storage, JSON.stringify(settings.giveaways, null, 3));
}

function edit(id) {
    const giveaway = settings.giveaways.find(x => x.ended === false && x.id === id);
    if (giveaway) {
        send(giveaway);
        const manager = this;
        settings.interval[giveaway.id] = setInterval(function () {
            if (giveaway.endAt - Date.now() <= 0) {
                end(giveaway);
                clearInterval(settings.interval[giveaway.id]);
            } else {
                send(giveaway);
            }
        }, settings.updateCountdownEvery);
        saveStorage();
    }
}
function end(giveaway, rerolled) {
        const winners = giveaway.participationsID.sort(() => Math.random() - Math.random()).slice(0, giveaway.winnerCount)
        send(giveaway, winners, rerolled);
        giveaway.winnersID = winners;
        giveaway.ended = true;
        saveStorage();
}

async function send(json, winners, rerolled) {
    const giveaway = settings.giveaways.find(x => x.id === json.id);
    if (!giveaway) return;
    const data = JSON.parse(JSON.stringify(giveaway.data).replaceAll("{prize}", json.prize).replaceAll("{user}", `<@${json.authorID}>`).replaceAll("{duration}", `<t:${json.endAt}:R>`).replaceAll("{progressBar}", progressBar(json.endAt - Date.now(), json.endAt - json.startAt)));
    const channel = await settings.client.channels.cache.get(giveaway.channelID);
    if(!channel){
        giveaway.ended = true;
        return saveStorage();
    }
    if (winners) {
        if (winners.length) {
            const winner = winners.map(x => `<@${x}>`).join(", ");
            channel.send(data.content.winMessage.replace("{winner}", winner))
            data.embed.description = data.embed.description.end.replace("{winner}", winner + ".");
        } else {
            data.embed.description = data.embed.description.end.replace("{winner}", data.content.noWinner);
            channel.send(data.content.noWinner);
        }
        giveaway.ended = true;
        if(rerolled) settings.client.emit("giveawayRerolled", giveaway);
        else settings.client.emit("giveawayEnded", giveaway);
        if(data.embed.footer) data.embed.footer = {
            text: data.embed.footer.end,
            icon_url: data.embed.footer.icon_url
        };
    } else {
        if(data.embed.description) data.embed.description = data.embed.description.start;
        if(data.embed.footer) data.embed.footer = {
            text: data.embed.footer.start,
            icon_url: data.embed.footer.icon_url
        };
    }
    let send = {};
    if (data.content.text === "") send = {embeds: [data.embed], components: [data.button]}
    else send = {content: data.content.text, embeds: [data.embed], components: [data.button]};

    if (giveaway.messageGiveaway) channel.messages.fetch(giveaway.messageGiveaway).then(msg => msg.edit((send)));
    else {
        let msg = await channel.send(send);
        giveaway.messageGiveaway = msg.id;
        saveStorage();
    }
}

/*
* Thanks to https://github.com/Mw3y/Text-ProgressBar 🎉.
 */

function progressBar(value, maxValue) {
    let percentage = 1 - value / maxValue;
    if (percentage > 1) percentage = 1;
    const progress = Math.round((10 * percentage));
    const emptyProgress = 10 - progress;

    const progressText = '█'.repeat(progress);
    const emptyProgressText = '░'.repeat(emptyProgress);
    const percentageText = Math.round(percentage * 100) + '%';

    return `[${progressText + emptyProgressText}] **(${percentageText})**`;
}

String.prototype.replaceAll = function(target, replacement) {
    return this.split(target).join(replacement);
};