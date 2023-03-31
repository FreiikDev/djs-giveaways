const {existsSync, writeFileSync} = require('fs');

String.prototype.replaceAll = function (target, replacement) {
    return this.split(target).join(replacement);
};

/*
* Class Manager
 */

module.exports = class Manager {

    /*
     * @param  {Discord.Client}        client, the client used for djs-giveaways
     * @param {string}        options.storage, the point where the module store giveaways (must be a JSON file, that contains array)
     * @param {number} options.updateInterval, giveaway messages will be updated with this specific interval
     */

    constructor(client, {storage, updateInterval}) {
        this.client = client;
        // @ts-ignore
        this.cache = {};
        // @ts-ignore
        if (storage)
            this.cache.storage = storage;
        else
            new Error("There's no valid storage file in JSON (.json).");
        if (updateInterval)
            this.cache.updateInterval = updateInterval;
        else
            this.cache.updateInterval = 30000;
        this.cache.interval = [];
        if (!existsSync(this.cache.storage) || !String(this.cache.storage).endsWith(".json"))
            throw new Error("There's no valid storage file in JSON (.json).");
        this.cache.giveaways = require(this.cache.storage);
        this.client.on('interactionCreate', (interaction) => {
            // @ts-ignore
            const id = interaction.customId || null;
            if (!id || interaction.user.bot)
                return;
            let giveaway = this.cache.giveaways.find(x => x.id === id && x.ended === false);
            if (interaction.isButton() && giveaway) {
                // @ts-ignore
                if (interaction.member.roles.cache.find((r) => giveaway.blockedRoles.includes(r.id)) || giveaway.blockedUsers.includes(interaction.user.id))
                    return;
                if (giveaway.participations.includes(interaction.user.id)) {
                    interaction.reply({content: giveaway.data.content.removeParticipate, ephemeral: true});
                } else {
                    giveaway.participations.push(interaction.user.id);
                    interaction.reply({content: giveaway.data.content.participate, ephemeral: true});
                    this.saveStorage();
                }
            }
        });
        this.client.on("ready", () => {
            this.cache.giveaways.forEach(giveaway => {
                if (giveaway.ended === true)
                    return;
                const date = Number(giveaway.endAt) - Date.now();
                if (date <= 0)
                    this.end(giveaway);
                this.edit(giveaway.id);
            });
        });
    }

    /*
    * Create a giveaway
    *
    * @param {Discord.Message} message, the message of the author
    * @param {object}             data, You need to provide the time (in timestamp), the prize and the number of winners. Other features can be seen below
    *
    * @returns {Promise<Giveaway>} Giveaway settings
    */
    create(message, data) {
        return new Promise((resolve) => {
            if (!data.time || !data.prize)
                return;
            if (!data.winnerCount)
                data.winnerCount = 1;
            if (!data.channel)
                data.channel = message.channel.id;
            const id = Math.random().toString(36).toUpperCase().replace(/[0-9O]/g, '').substring(1, 8);
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
                for (const [a] of Object.entries(content)) {
                    if (data.data[a]) {
                        if (typeof data.data[a] === "object") {
                            // @ts-ignore
                            content[a] = Object.assign(content[a], data.data[a]);
                        } else {
                            // @ts-ignore
                            content[a] = data.data[a];
                        }
                    }
                }
            }
            data.content = content;
            if (data.content.embed.author)
                data.content.embed.author = {
                    name: message.author.tag,
                    icon_url: message.author.avatarURL({format: "png", dynamic: true, size: 16})
                };
            else {
                delete data.content.embed.author;
            }
            let json = {
                id: id,
                messageID: message.id,
                channelID: data.channel,
                guildID: message.guildId,
                authorID: message.author.id,
                startAt: Date.now(),
                endAt: Date.now() + data.time,
                ended: false,
                prize: data.prize,
                winnerCount: data.winnerCount ? data.winnerCount : 1,
                data: data.content,
                participations: [],
                winners: [],
                blockedUsers: data.blockedUsers ? data.blockedUsers : [],
                blockedRoles: data.blockedRoles ? data.blockedRoles : [],
                messageGiveaway: ""
            };
            json.data = JSON.parse(JSON.stringify(json.data).replaceAll("{prize}", json.prize).replaceAll("{user}", `<@${json.authorID}>`).replaceAll("{duration}", `<t:${Math.round(json.endAt / 1000)}:R>`).replaceAll("{id}", id).replaceAll("{button}", data.button ? data.button : "Participate"));
            // @ts-ignore
            this.cache.giveaways.push(json);
            this.saveStorage();
            this.edit(json.id);
            this.client.emit("giveawayStarted", json);
            resolve(json);
        });
    }

    /*
    * Stop a giveaway
    *
    * @param {Discord.Snowflake/string} id, the message ID or ID of the giveaway
    *
    * @returns {Promise<Giveaway>} Giveaway settings
    */
    stop(id) {
        return new Promise((resolve) => {
            const giveaway = this.cache.giveaways.find(x => x.ended === false && x.id === id || x.messageGiveaway === id);
            if (giveaway) {
                this.end(giveaway);
                return resolve(giveaway);
            }
            resolve(undefined);
        });
    }

    /*
    * Reroll a giveaway
    *
    * @param {Discord.Snowflake/string} id, the message ID or ID of the giveaway
    *
    * @returns {Promise<Giveaway>} Giveaway settings
    */
    reroll(id) {
        return new Promise((resolve) => {
            const giveaway = this.cache.giveaways.find(x => x.ended === true && x.id === id || x.messageGiveaway === id);
            if (giveaway) {
                this.end(giveaway, true);
                return resolve(giveaway);
            }
            resolve(undefined);
        });
    }

    /*
    * Delete on the storage a giveaway
    *
    * @param {Discord.Snowflake/string} id, the message ID or ID of the giveaway
    *
    * @returns {Promise<Giveaway>} Giveaway settings
    */
    delete(id) {
        return new Promise((resolve) => {
            const giveaway = this.cache.giveaways.find(x => x.id === id || x.messageGiveaway === id);
            if (giveaway) {
                this.cache.giveaways = this.cache.giveaways.filter(x => x.id !== id || x.messageGiveaway === id);
                this.client.emit("giveawayDeleted", giveaway);
                this.saveStorage();
                return resolve(giveaway);
            }
            resolve(undefined);
        });
    }

    edit(id) {
        const giveaway = this.cache.giveaways.find(x => x.ended === false && x.id === id);
        if (giveaway) {
            this.send(giveaway);
            const manager = this;
            // @ts-ignore
            this.cache.interval[giveaway.id] = setInterval(function () {
                manager.send(giveaway);
            }, this.cache.updateInterval);
            setTimeout(this.end.bind(this, giveaway), giveaway.endAt - Date.now());
            this.saveStorage();
        }
    }

    end(giveaway, rerolled) {
        const winners = giveaway.participations.sort(() => Math.random() - Math.random()).slice(0, giveaway.winnerCount);
        if (!this.cache.interval[giveaway.id]) {
            return;
        }
        // @ts-ignore
        clearInterval(this.cache.interval[giveaway.id]);
        this.cache.interval = this.cache.interval.filter(x => x !== x[giveaway.id]);
        if (rerolled)
            this.send(giveaway, winners, rerolled);
        else
            this.send(giveaway, winners);
        giveaway.winners = winners;
        giveaway.ended = true;
        this.saveStorage();
    }

    async send(json, winners, rerolled) {
        const giveaway = this.cache.giveaways.find(x => x.id === json.id);
        if (!giveaway)
            return;
        let data = JSON.parse(JSON.stringify(giveaway.data).replaceAll("{prize}", json.prize).replaceAll("{user}", `<@${json.authorID}>`).replaceAll("{duration}", `<t:${json.endAt}:R>`)),
            // @ts-ignore
            channel = await this.client.channels.cache.get(giveaway.channelID);
        if (!channel) {
            giveaway.ended = true;
            return this.saveStorage();
        }
        if (winners) {
            // @ts-ignore
            data.button.components[0].disabled = true;
            if (winners.length) {
                const winner = winners.map((x) => `<@${x}>`).join(", ");
                await channel.send(data.content.winMessage.replace("{winner}", winner));
                data.embed.description = giveaway.data.embed.description.end.replace("{winner}", winner + ".");
            } else {
                data.embed.description = giveaway.data.embed.description.end.replace("{winner}", data.content.noWinner);
                await channel.send(data.content.noWinner);
            }
            giveaway.ended = true;
            if (rerolled)
                this.client.emit("giveawayRerolled", giveaway);
            else
                this.client.emit("giveawayEnded", giveaway);
            if (data.embed.footer)
                data.embed.footer = {
                    text: giveaway.data.embed.footer.end,
                    icon_url: data.embed.footer.icon_url
                };
        } else {
            if (data.embed.description)
                data.embed.description = giveaway.data.embed.description.start;
            if (data.embed.footer)
                data.embed.footer = {
                    text: giveaway.data.embed.footer.start,
                    icon_url: data.embed.footer.icon_url
                };
        }
        data = JSON.parse(JSON.stringify(data).replaceAll("{progressBar}", progressBar(json.endAt - Date.now(), json.endAt - json.startAt)));
        let send = {};
        if (data.content.text === "")
            send = {embeds: [data.embed], components: [data.button]};
        else
            send = {content: data.content.text, embeds: [data.embed], components: [data.button]};
        if (giveaway.messageGiveaway)
            channel.messages.fetch(giveaway.messageGiveaway).then(msg => msg.edit((send)));
        else {
            let msg = await channel.send(send);
            giveaway.messageGiveaway = msg.id;
            this.saveStorage();
        }
    }

    saveStorage() {
        writeFileSync(this.cache.storage, JSON.stringify(this.cache.giveaways, null, 3));
    }
}

/*
* Thanks to https://github.com/Mw3y/Text-ProgressBar 🎉.
 */
function progressBar(value, maxValue) {
    let percentage = 1 - value / maxValue;
    if (percentage > 1)
        percentage = 1;
    const progress = Math.round((10 * percentage));
    const emptyProgress = 10 - progress;
    const progressText = '█'.repeat(progress);
    const emptyProgressText = '░'.repeat(emptyProgress);
    const percentageText = Math.round(percentage * 100) + '%';
    return `[${progressText + emptyProgressText}] **(${percentageText})**`;
}