const Discord         = require("discord.js");
const { Client, Intents } = require('discord.js');
const {prefix, token} = require("./config.json");
const ytdl            = require("ytdl-core");

const client = new Client({ 
        intents: [
                Intents.FLAGS.GUILDS,
                 Intents.FLAGS.GUILD_MESSAGES
                ] 
 });

const queue = new Map();

client.once("ready", () => {
        console.log("Bot musique ready to play!");
});

client.once("reconnecting", () => {
        console.log("Reconnecting!");
});

client.once("disconnect", () => {
        console.log("Disconnect!");
});

client.on("message", async message => {
        if (message.author.bot) { 
                return;
        }
        if (!message.content.startsWith(prefix)) {
                return;
        }

        if(message.channel === prefix + "ping"){
                message.reply("Yoh la famille tu connais c'est la streetzer, je rigole on peut y aller")
        }

        else if(message.content === prefix + "help"){
                message.channel.send("**__Mes commandes sont__**\n !ping: checker si le bot est présent \n !play pour jouer la musique \n !stop: pour arrê^ter la musique ")
        }

        const serverQueue = queue.get(message.guild.id);

        if (message.content.startsWith(`${prefix}play`)) {
                execute(message, serverQueue); // On appelle execute qui soit initialise et lance la musique soit ajoute à la queue la musique
                return;
        }
        
        else if (message.content.startsWith(`${prefix}stop`)) {
                stop(message, serverQueue); // Pour arrêter la lecture de la musique
                return;
        }
        else {
                message.channel.send("You need to enter a valid command!");
        }

});



async function execute(message, serverQueue) {
    const args = message.content.split(" "); // On récupère les arguments dans le message pour la suite

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) // Au cas ou l'utilisateur n'est pas connecté
    {
            return message.channel.send(
                "Vous devez être dans un salon vocal!"
            );
    }
    const permissions = voiceChannel.permissionsFor(message.client.user); // On récupère les permissions du bot pour le salon vocal
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) { // Si le bot n'a pas les permissions
            return message.channel.send(
                "J'ai besoin des permissions pour rejoindre le salon et pour y jouer de la musique!"
            );
    }

    const songInfo = await ytdl.getInfo(args[1]);
    const song     = {
            title: songInfo.videoDetails.title,
            url  : songInfo.videoDetails.video_url,
    };

    if (!serverQueue) {
            const queueConstruct = {
                    textChannel : message.channel,
                    voiceChannel: voiceChannel,
                    connection  : null,
                    songs       : [],
                    volume      : 1,
                    playing     : true,
            };

            // On ajoute la queue du serveur dans la queue globale:
            queue.set(message.guild.id, queueConstruct);
            // On y ajoute la musique
            queueConstruct.songs.push(song);

            try {
                    // On connecte le bot au salon vocal et on sauvegarde l'objet connection
                    var connection           = await voiceChannel.join();
                    queueConstruct.connection = connection;
                    // On lance la musique
                    play(message.guild, queueConstruct.songs[0]);
            }
            catch (err) {
                    //On affiche les messages d'erreur si le bot ne réussi pas à se connecter, on supprime également la queue de lecture
                    console.log(err);
                    queue.delete(message.guild.id);
                    return message.channel.send(err);
            }
    }
    else {
            serverQueue.songs.push(song);
            console.log(serverQueue.songs);
            return message.channel.send(`${song.title} has been added to the queue!`);
    }

}

function stop(message, serverQueue) {
    if (!message.member.voice.channel) // on vérifie que l'utilisateur est bien dans un salon vocal pour skip
    {
            return message.channel.send(
                "Vous devez être dans un salon vocal pour stopper la lecture!"
            );
    }
    if (!serverQueue) // On vérifie si une musique est en cours
    {
            return message.channel.send("Aucune lecture de musique en cours !");
    }
    serverQueue.songs = [];
    serverQueue.connection.dispatcher.end();
}

function play(guild, song) {
    console.log(song);
    const serverQueue = queue.get(guild.id); // On récupère la queue de lecture
    if (!song) { // Si la musique que l'utilisateur veux lancer n'existe pas on annule tout et on supprime la queue de lecture
            serverQueue.voiceChannel.leave();
            queue.delete(guild.id);
            return;
    }
    // On lance la musique
    const dispatcher = serverQueue.connection
        .play(ytdl(song.url, { filter: 'audioonly' }))
        .on("finish", () => { // On écoute l'événement de fin de musique
                serverQueue.songs.shift(); // On passe à la musique suivante quand la courante se termine
                play(guild, serverQueue.songs[0]);
        })
        .on("error", error => console.error(error));
    dispatcher.setVolume(1); // On définie le volume
    serverQueue.textChannel.send(`Démarrage de la musique: **${song.title}**`);
}

client.login(token);
