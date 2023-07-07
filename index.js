const { google } = require('googleapis');
const { authorize } = require('./auth')
const { getAuthorizedUserEmail, getLatestEmailProps, getMailDetails, checkIfFirstMessage, replyToEmail, moveMessageToLabel } = require('./gmailHandler')


// This is the main worker function that checks for new emails and replies to them

async function autoReplier(gmail, lastEmailId) {
    const { id, threadId } = await getLatestEmailProps(gmail)
    console.log("NEW ID", id)
    console.log(id, threadId)
    if (id === lastEmailId) {
        console.log("No new mail")
        return id
    }
    const isThreadStarter = await checkIfFirstMessage(gmail, id, threadId)
    if (isThreadStarter) {
        console.log("First message in the thread!")
        const { senderEmail, subject, messageID } = await getMailDetails(gmail, id)
        const userEmail = await getAuthorizedUserEmail(gmail)
        console.log(userEmail)
        replyToEmail(gmail, userEmail, senderEmail, subject, messageID, id, threadId)
        moveMessageToLabel(gmail, id, "afterVacation")


    } else {
        console.log("Message from existing thread")
    }
    return id
}


// Authorizes the user and runs the worker function on interval
async function main() {
    const auth = await authorize();
    const gmail = google.gmail({ version: 'v1', auth });

    // variable that tracks the last checked email id
    let lastEmailId = null;
    console.log("last email id", lastEmailId)

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    // Generates random number between min and max inclusive
    function between(min, max) {  
        return Math.floor(
          Math.random() * (max - min) + min
        )
      }

    async function loop() {
        while (true) {
            // update the lastEmailid
            lastEmailId = await autoReplier(gmail, lastEmailId);
            console.log( "last email id",lastEmailId);
            const delayTime = between(45, 120);
            console.log("Waiting for", delayTime, "seconds..")
            await delay(delayTime * 1000);
        }
    }

    await loop()

}

main()