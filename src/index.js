const Rareterm = require('../index');
const terminalImage = require('terminal-image');
const got = require('got');
const Discord = require("discord.js");
const fetch = require("node-fetch");
const Jimp = require("jimp");
const un = require("unsplash-js");
const randomwords = require("random-words");
const pinataSDK = require('@pinata/sdk');
const pinata = pinataSDK('c739f459fea0766c37d2', '0f1683f125f96b275d730fdb043064a107fe24c7f9cc99f9522413998695497c'); // todo use dotenv for keys
const { Readable } = require('stream');


const rarepress = new Rareterm();
(async() => {
    // 1. initialize
    console.log('instantiating rareterm');
    await rarepress.init({ host: "https://rinkeby.rarenet.app/v1" })
})();

const Intents = Discord.Intents;


const client = new Discord.Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.DIRECT_MESSAGES, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS] });
const DiscordAPIKey = "ODgwOTc1NDA4NTI1MzY5NDM0.YSmGSQ.AlG7W8c7CPdw1PDNE6YlQZJ4zOc";
const UnsplashAPIKey = "gX-5eG4Om1OrDO3I7plUAuJZh-2K22ho1OL_TYPf5X0";
const COLLAB_LAND_APP_ID = "880975408525369434";
const COLLAB_LAND_APP_SECRET = "4047cd8122f93b1d9a251fd089110afe12c95ec90384690144da279d34a9a0f6";

const MIN_REACTIONS_TO_MINT = 2;
const PRICE_PER_COOKIE = 0.1;

const accountAddress = "0x7140D8E707Ade3da9B7a3cD6771739Db0D103C01";



client.login(DiscordAPIKey);

const usAccessKey = UnsplashAPIKey;

const Unsplash = un.createApi({
    accessKey: usAccessKey,
    fetch: fetch
        //...other fetch options
});

console.log(client.channels);
client.on("ready", () => {
    console.log(`Logged in...`);
});

const prefix = "!";
client.on("messageCreate", async function(message) {
    if (message.author.bot) return;
    if (!message.content.startsWith(prefix)) return;
    const channelId = message.channel.id;
    const commandBody = message.content.slice(prefix.length);
    const moreparse = commandBody.split("|");
    const args = moreparse[0].split(" ");
    const command = args.shift().toLowerCase();
    if (command === "bake") {

        // > throw text on top (align it, size it - use rule of thumb if I have to (max is 140 chars)
        // > technique to merge with animated gif
        //   https://stackoverflow.com/questions/64673868/how-to-add-watermark-to-an-animated-gif-image-using-jimp-javascript

        // > when minting         
        //   check collab.land api to see if user has page tokens
        //   set misfortune cookie metadata to image - static
        //                                   animation_url - animated gif with text (add x seconds of text???)

        var misfortuneText = args.join(" ");
        var imgQuery = (moreparse.length > 1) ? moreparse[1] : randomwords(1)[0]; //args.join(" ");
        console.log(message.author + "is baking a misfortune cookie...");
        console.log(imgQuery);
        //var textToWrite = (argx[1] !== undefined) ? argx[1] : "";

        Unsplash.search
            .getPhotos({
                query: imgQuery,
                page: 1,
                perPage: 1,
                orientation: "landscape"
            })
            .then((result) => {
                console.log(result.response.results[0]);
                //fetch user profile image & username (add to img)
                var bgImageURL = result.response.results[0].urls.regular;
                var dlEndpointURL = result.response.results[0].links.download;
                var username = result.response.results[0].user.username;
                var fullname = result.response.results[0].user.name;
                Jimp.read(bgImageURL).then((bg) => {
                    Jimp.loadFont(Jimp.FONT_SANS_128_BLACK).then((font) => {
                        wrapText(bg, font, misfortuneText, 0, (bg.bitmap.height / 2) - 10, bg.bitmap.width - 200, 72);

                        Jimp.loadFont(Jimp.FONT_SANS_64_WHITE).then((font) => {
                                wrapText(bg, font, misfortuneText, 0, (bg.bitmap.height / 2) - 10, bg.bitmap.width - 200, 72);
                                //bg.print(font, bg.bitmap.width / 2, bg.bitmap.height / 2, misfortuneText);
                                bg.getBuffer(Jimp.MIME_PNG, (err, buffer) => {

                                    console.log('creating attachment');

                                    const IMGattachment = new Discord.MessageAttachment(
                                        buffer,
                                        "wippimg.png"
                                    );

                                    console.log("made attachment");
                                    const coupleMatchEmbed = new Discord.MessageEmbed()
                                        .setTitle("Misfortune Cookie")
                                        .setAuthor(message.author.username, message.author.avatarURL, "https://discordapp.com/users/" + message.author.id)
                                        .addField('unsplashuser', username)
                                        .setImage("attachment://wippimg.png");

                                    // how do I do this in discord v13?
                                    message.channel.send({ embeds: [coupleMatchEmbed], files: [IMGattachment] })
                                        .then((msg) => {
                                            // console.log(msg.embeds[0].image);
                                            // also get the url of the image

                                            msg.react("❤️");

                                        })
                                        .catch((allerrors) => { console.log(allerrors) });
                                });
                            })
                            .catch(err => function() {
                                console.log("guessing nothing was found");
                            });
                    });
                });
            })

        .catch(err => function() {
            console.log(err);
        });
    }
});

client.on("messageReactionAdd", (reaction, user) => {
    const message = reaction.message;
    const embeds = message.embeds;
    console.log("reaction added");
    //return if no embeds
    if (!embeds.length) return;

    const firstEmbed = embeds[0];

    var discordId = reaction.message.embeds[0].author.url.slice(29);
    console.log(reaction.message.embeds[0].author.url);
    console.log("discordid: " + discordId);

    //check with collabland
    var userwallet = fetchCollabLandUserWallets(discordId).then((wallet) => {
        console.log("user wallet: " + wallet);
    });
    //add your logic here
    if (reaction.emoji.name === "❤️" && message.author.bot && (reaction.count >= MIN_REACTIONS_TO_MINT)) {

        // add reaction that makes this mintable
        message.react("💰");
    }
    // check if the owner hit the moneybag
    //console.log(reaction);
    if (reaction.emoji.name === "💰" && reaction.count >= MIN_REACTIONS_TO_MINT && reaction.emoji.username == reaction.message.embeds[0].username) {
        console.log("mint me");

        var MCWriter = accountAddress;

        //have to get the user's info
        //want to get total number of likes
        //let's get some info about the original message if we can
        var info = reaction.message.embeds[0];
        console.log(info);
        console.log(reaction.message.embeds.fields);
        var mintdetails = {
            authorName: info.author.name,
            imageURL: info.image.url,
            title: 'Misfortune Cookie',
            unsplashref: info.fields[0].value
        }

        mintNFT(MCWriter, mintdetails.authorName, mintdetails.imageURL, mintdetails.title, mintdetails.unsplashref);
        //provider.enable();
    }

});

async function mintNFT(MCWriter, authorName, imageURL, title, unsplashuser) {

    var minter = MCWriter; //"0x5D461c5cB69eF94C64ff09427DD3b5d918C3987e"; // placeholder WIPP account

    console.log('attempting mint: ', "MCWriter: " + MCWriter, "minter: " + minter);

    console.log('trying to add');
    let cid = await rarepress.fs.add(imageURL);
    //console.log(cid);
    var NFTmetadata = {
        "name": title,
        "description": "a misfortune by " + authorName,
        "image": "https://ipfs.io/ipfs/" + cid,
        "attributes": [{
            "key": "Creator",
            "trait_type": "text",
            "value": authorName
        }, {
            "key": "Unsplash User",
            "trait_type": "text",
            "value": unsplashuser
        }]
    };
    const body = await got('https://rinkeby.rarenet.app/ipfs/' + cid).buffer();

    // 3. Print preview
    console.log(await terminalImage.buffer(body));

    try {
        // 4. create token
        let token = await rarepress.token.create({
            type: "ERC721",
            metadata: {...NFTmetadata },
            royalties: [
                { account: accountAddress, value: 5000 },
                { account: "0x7Dd44cD59D0320a8A2A0a6F521BFE767108dD2E3", value: 5000 }
            ]
        })
        console.log("token", token)

        // publish rarepress fs files to IPFS
        await rarepress.fs.push(cid)
        await rarepress.fs.push(token.uri)

        let sent = await rarepress.token.send(token)
        console.log("sent", sent)

        let trade = await rarepress.trade.create({
            what: { type: "ERC721", id: token.tokenId, },
            with: { type: "ETH", value: PRICE_PER_COOKIE * 1000000000000000000 }
        })
        console.log("signed trade", trade)
        let sentTrade = await rarepress.trade.send(trade)
        console.log("sent trade", sentTrade)
    } catch (e) {
        console.log("ERROR", e.toString())
    }

    // step 3 - do come crazy signer thing (do all creators have to sign? do all royalty receivers have to sign?)
    // https://github.com/rarible/protocol-documentation/blob/master/asset/creating-an-asset.md
    // https://github.com/evgenynacu/sign-typed-data/blob/master/src/lazy-mint/script.ts


}

const make = (creator) => {
    const timestamp = Date.now();
    const rand = (Math.random() * 10 ** 18).toString().slice(0, 11);
    return BigInt(creator + timestamp + rand).toString(10);
}

function wrapText(context, font, text, x, y, maxWidth, lineHeight) {
    var words = text.split(' ');
    var line = '';
    var lines = [];
    var totalHeight = 0;

    for (var n = 0; n < words.length; n++) {
        var testLine = line + words[n];
        var testWidth = Jimp.measureText(font, testLine);
        testLine += ' ';
        if (testWidth > maxWidth && n > 0) {
            lines.push([line, 100 + (context.bitmap.width - testWidth) / 2, y]);
            totalHeight += Jimp.measureTextHeight(font, line) + lineHeight;
            line = words[n] + ' ';
            y += lineHeight;
        } else {
            line = testLine;
        }
    }
    var lastLineWidth = Jimp.measureText(font, line);
    lines.push([line, (context.bitmap.width - lastLineWidth) / 2, y]);
    totalHeight += Jimp.measureTextHeight(font, line);

    var offset = (context.bitmap.height - totalHeight) / 2;
    for (var j = 0; j < lines.length; j++) {
        context.print(font, lines[j][1], offset + j * lineHeight, lines[j][0]);
    }
}


const URL_COLLAB_LAND_AUTH =
    'https://api-qa.collab.land/client-applications/login-as-user?ttl=500';
const URL_COLLAB_LAND_USER_WALLETS =
    'https://api-qa.collab.land/account/wallets';

const registerCollabLand = async () => {
    const response = await fetch("https://api-qa.collab.land/client-applications", {
        method: 'POST',
        mode: 'cors',
        headers: {
            'Content-Type': 'application/json',
            'x-client-id': COLLAB_LAND_APP_ID,
            'x-client-secret': COLLAB_LAND_APP_SECRET,
        },
        body: JSON.stringify({ id: discordId, platform: 'discord' }),
    })
    const json = await response.json()
    console.log(json);
}
const fetchCollabLandUserWallets = async(discordId) => {
    // Auth session
    const response = await fetch(URL_COLLAB_LAND_AUTH, {
        method: 'POST',
        mode: 'cors',
        headers: {
            'Content-Type': 'application/json',
            'x-client-id': COLLAB_LAND_APP_ID,
            'x-client-secret': COLLAB_LAND_APP_SECRET,
        },
        body: JSON.stringify({ id: discordId, platform: 'discord' }),
    })
    const json = await response.json()
    const jwt = json.message

    console.log("collabland json: " + JSON.stringify(json))

    // Get wallet details
    const response2 = await fetch(URL_COLLAB_LAND_USER_WALLETS, {
        method: 'GET',
        mode: 'cors',
        headers: {
            'Content-Type': 'application/json',
            'x-run-as-token': jwt,
        },
    })
    const json2 = await response2.json()
    const wallets = json2.items
    return wallets
}


registerCollabLand();