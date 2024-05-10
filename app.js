const { Client, Events } = require("discord.js");
const fs = require("fs");

const birthdays = fs.readFileSync("data/birthdays.txt", "ascii").split("\n")
    .map(line => line.trim().split(","))
    .map(([name, date]) => {
        const [month, day] = date.split(" ");
        return {
            name, 
            date: new Date(2000, ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].indexOf(month), day)
        };
    });

const EARLY_WARNING = 24*60*60*1000 * 20;

// get all birthdays within 2 weeks of the current date
const getUpcomingBirthdays = () => {
    const curDate = new Date();
    const curFullYear = curDate.getFullYear();
    return birthdays.map(birthday => {

        // handle years properly
        const dateThisYear = new Date(birthday.date);
        dateThisYear.setFullYear(curFullYear);
 
        const dateNextYear = new Date(birthday.date);
        dateNextYear.setFullYear(curFullYear + 1);

        return {name: birthday.name, date: curDate > dateThisYear ? dateNextYear : dateThisYear};

    }).filter(bday => bday.date - curDate < EARLY_WARNING).sort((a, b) => a.date - b.date);
}

const bot = new Client({intents: []});
bot.login(process.env.TOKEN);

let channel = null;

bot.once(Events.ClientReady, async () => {
    console.log("Logged in");
    channel = await bot.channels.fetch(process.env.CHANNEL_ID);
    runAtMidnight();
});

const remind = () => {
    if(channel) {
        const birthdays = getUpcomingBirthdays();
        channel.send("**UPCOMING BIRTHDAYS**\n" + birthdays.map(({name, date}) => `${name} - ${date.toLocaleDateString([], {weekday: "long",month:"long",day:"numeric"})}`).join("\n"))
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