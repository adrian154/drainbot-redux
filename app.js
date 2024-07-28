const { Client, Events } = require("discord.js");
const fs = require("fs");

const MESSAGEID_PATH = "data/lastmessage.txt";
const EARLY_WARNING = 24*60*60*1000 * 20;

const birthdays = fs.readFileSync("data/birthdays.txt", "ascii").split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
        const [name, date] = line.split(",")
        const [month, day] = date.split(" ");
        return {
            name, 
            date: new Date(2000, ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].indexOf(month), day)
        };
    });

// get all birthdays within 2 weeks of the current date
const getUpcomingBirthdays = () => {
    const curDate = new Date();
    return birthdays.map(birthday => {

        const bdayDate = new Date(birthday.date);
        bdayDate.setFullYear(curDate.getFullYear());

        // if birthday already happened this year, bump to next year
        if(bdayDate < curDate) {
            bdayDate.setFullYear(curDate.getFullYear() + 1);
        }

        return {
            name: birthday.name,
            date: bdayDate,
            isToday: curDate.getMonth() == bdayDate.getMonth() && curDate.getDate() == bdayDate.getDate()
        };

    }).filter(bday => bday.isToday || bday.date - curDate < EARLY_WARNING).sort((a, b) => a.date - b.date);
}

const bot = new Client({intents: []});
bot.login(process.env.TOKEN);

let channel = null;
let previousMessage = null;

bot.once(Events.ClientReady, async () => {
    console.log("Logged in");
    channel = await bot.channels.fetch(process.env.CHANNEL_ID);
    if(fs.existsSync(MESSAGEID_PATH)) {
        previousMessage = await channel.messages.fetch(fs.readFileSync(MESSAGEID_PATH, "ascii"));
    }
    runAtMidnight();
});

const formatBday = ({name, date, isToday}) => {
    const dateStr = date.toLocaleDateString([], {weekday: "long", month:"long", day:"numeric"});
    if(isToday)
        return `${name} - **TODAY** (${dateStr})`;
    else
        return `${name} - ${dateStr}`;
};

const remind = () => {
    if(channel) {

        // if necessary, delete previous message
        if(previousMessage) {
            previousMessage.delete();
            previousMessage = null;
        }

        const birthdays = getUpcomingBirthdays();
        channel.send("*Upcoming Birthdays* @everyone\n" + birthdays.map(formatBday).join("\n"))
            .then(message => {
                previousMessage = message;
                fs.writeFileSync(MESSAGEID_PATH, message.id, "ascii"); // store message id
            });
            
    }
};

let lastRunDate = null;
const runAtMidnight = () => {
    const curDate = new Date();
    if(!lastRunDate || lastRunDate.getDate() != curDate.getDate()) {
        lastRunDate = curDate;
        remind();
    }
};

setInterval(runAtMidnight, 1000);