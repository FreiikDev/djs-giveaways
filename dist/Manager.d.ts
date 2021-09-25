import { Channel, Client, Guild, Message, MessageComponentType, User } from 'discord.js';
declare global {
    interface String {
        replaceAll(target: string, replacement: string): string;
    }
}
export declare class Manager {
    private client;
    cache: {
        storage: string;
        interval: Array<string>;
        updateInterval: number;
        giveaways: Array<{
            messageGiveaway: Message["id"];
            id: string;
            messageID: Message["id"];
            channelID: Channel["id"];
            guildID: Guild["id"];
            authorID: User["id"];
            startAt: number;
            endAt: number;
            ended: boolean;
            prize: string;
            winnerCount: number;
            data: {
                content: {
                    text: string;
                    participate: string;
                    removeParticipate: string;
                    winMessage: string;
                    noWinner: string;
                };
                embed: {
                    color: number;
                    author: boolean;
                    title: string;
                    footer: {
                        start: string;
                        end: string;
                        text: string;
                        icon_url: string;
                    };
                    description: {
                        start: string;
                        end: string;
                    };
                    timestamp: number;
                };
                button: MessageComponentType;
            };
            participationsID: Array<User["id"]>;
            winnersID: Array<User["id"]>;
        }>;
    };
    constructor(client: Client, { storage, updateInterval }: {
        storage: string;
        updateInterval: number;
    });
    create(message: Message, data: {
        time: number;
        prize: any;
        winnerCount: number;
        channel: any;
        data: {
            [x: string]: any;
        };
        content: {
            embed: any;
            content?: {
                text: string;
                participate: string;
                removeParticipate: string;
                winMessage: string;
                noWinner: string;
            };
            button?: {
                type: number;
                components: {
                    style: number;
                    label: string;
                    custom_id: string;
                    disabled: boolean;
                    emoji: {
                        id: null;
                        name: string;
                    };
                    type: number;
                }[];
            };
        };
        button: string;
    }): Promise<unknown>;
    stop(id: string): void;
    reroll(id: string): void;
    delete(id: string): void;
    private edit;
    private end;
    private send;
    private saveStorage;
}
