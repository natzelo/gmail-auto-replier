// Get the specs of the lastest email that dropped in the personal inbox
async function getLatestEmailProps(gmail) {

    const res = await gmail.users.messages.list({
        userId: 'me',
        labelIds: ['UNREAD', 'INBOX', 'CATEGORY_PERSONAL'],
        maxResults: 1,
    });
    const messages = res.data.messages
    if (messages.length) {
        return {
            id: messages[0].id,
            threadId: messages[0].threadId
        }
    } else {
        return null
    }
}
/**
 * Returns message details like email id of the sender, subject and message-ID
 * from the message id
 * @param {gmail_v1.Gmail} gmail
 * 
 */
async function getMailDetails(gmail, message_id) {
    const res = await gmail.users.messages.get({ userId: 'me', id: message_id })
    const headers = res.data.payload.headers
    console.log("label of the message", res.data.labelIds)
    let senderEmail = '';
    let subject = '';
    let messageID = '';
    for (let i = 0; i < headers.length; i++) {
        if (headers[i].name === 'From') {
            senderEmail = headers[i].value;
        } else if (headers[i].name === 'Subject') {
            subject = headers[i].value;
        } else if (headers[i].name == 'Message-ID') {
            messageID = headers[i].value
        }
    }
    console.log(senderEmail, subject, messageID)
    return { senderEmail, subject, messageID }
}

/**
 * @param {gmail_v1.Gmail} gmail
 * checks if a given message is a thread starter
 */
async function checkIfFirstMessage(gmail, messageId, threadId) {

    const message = await gmail.users.messages.get({ userId: 'me', id: messageId });
    const thread = await gmail.users.threads.get({ userId: 'me', id: threadId });

    return message.data.id === thread.data.messages[0].id;

}

/**
 * @param {gmail_v1.Gmail} gmail
 *  get the email of the user using our app
 */
async function getAuthorizedUserEmail(gmail) {
    const res = await gmail.users.getProfile({ userId: 'me' })
    return res.data.emailAddress
}

/**
 * 
 * Sends a reply to the email 
 */
async function replyToEmail(gmail, userEmail, senderEmail, subject, messageID, id, threadId) {
    const msgText = "I'm on a vacation right now. Will get back to you as soon as possible!"
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
    const messageParts = [
        `From: ${userEmail}`,
        `To: ${senderEmail}`,
        'Content-Type: text/html; charset=utf-8',
        'MIME-Version: 1.0',
        `Subject: ${subject}`,
        `In-Reply-To: ${messageID}`,
        `References: ${messageID}`,
        '',
        `${msgText}`
    ];
    const message = messageParts.join('\n');

    // The body needs to be base64url encoded.
    const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    const res = await gmail.users.messages.send({
        userId: 'me',
        threadId,
        requestBody: {
            raw: encodedMessage,
        },
    });
    console.log(res.data);
    return res.data;
}

// Given a message ID, moves that message to a given label
// creates a label by that name if it doesn't exist
async function moveMessageToLabel(gmail, messageId, labelName) {
    try {
        // Check if the label exists
        const labelsRes = await gmail.users.labels.list({ userId: 'me' });
        const labels = labelsRes.data.labels;
        let labelId = '';

        const existingLabel = labels.find((label) => label.name === labelName);
        if (existingLabel) {
            labelId = existingLabel.id;
        } else {
            // Create the label if it doesn't exist
            const createLabelRes = await gmail.users.labels.create({
                userId: 'me',
                requestBody: {
                    labelListVisibility: 'labelShow',
                    messageListVisibility: 'show',
                    name: labelName,
                },
            });
            labelId = createLabelRes.data.id;
        }

        // Move the message to the label
        await gmail.users.messages.modify({
            userId: 'me',
            id: messageId,
            requestBody: {
                addLabelIds: [labelId],
                removeLabelIds: [],
            },
        });

        console.log('Message moved successfully!');
    } catch (err) {
        console.error('Error moving message:', err.message);
    }
}

module.exports = { getAuthorizedUserEmail, getLatestEmailProps, getMailDetails, checkIfFirstMessage, replyToEmail, moveMessageToLabel }