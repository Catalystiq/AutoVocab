// imports
import { google } from 'googleapis'
import { v4 as uuid } from 'uuid'
import chalk from 'chalk'
import fetch from 'node-fetch'
import * as dotenv from 'dotenv'
dotenv.config()

//authentication
const auth = await google.auth.getClient({
	keyFile: './secrets.json',
	scopes: ['https://www.googleapis.com/auth/drive'],
})

const slides = google.slides({
    version: 'v1',
    auth
})

//variables
const titleText = 'Vocab #3'
const subtitleText = 'James Nelson 11A'
const presentationId = '1RzdSu5rf5Urx0hNAYLLabQ-jbqfRJwgYiKMrbcR6WtU'
let req = []
const words = [
    'Nonchalant',
    'Dilatory',
    'Superfluous',
    'Condescend',
    'Acrimony',
    'Prodigious',
    'Daunt',
    'Tedious',
    'Mediocre',
    'Mandate',
    'Resignation',
    'Nurture',
    'Fervent',
    'Eclectic',
    'Composed',
    'Versatile',
    'Scathing',
    'Eloquent',
    'Commend',
    'Ecstasy',
]

//create the slides
req.push(createTitleSlide(titleText, subtitleText))
for(let i = 0; i < words.length; i++){
    const word = words[i]
    req.push(createVocabSlide(word, await getDefinition(word)))
}

makeBatchUpdate(presentationId, req)

async function getDefinition(word){
    console.log(chalk.blue('fetching definition for'), chalk.magenta(word))


    const response = await fetch(
		`https://dictionaryapi.com/api/v3/references/learners/json/${word}?key=${process.env.LEARNERS_KEY}`
	)
    const json = await response.json()
	return json[0].shortdef[0]
}

function createTitleSlide(titleText, subtitleText){
    console.log(chalk.cyanBright('creating title for presentation'))

    const titleSlideId = uuid()
    const titleTextId = uuid()
    const subtitleTextId = uuid()

    const titleSlideReq = [
        {
            createSlide: {
                objectId: titleSlideId,
                slideLayoutReference: {
                    predefinedLayout: 'TITLE'
                },
                placeholderIdMappings: [
					{
						objectId: titleTextId,
						layoutPlaceholder: { type: 'CENTERED_TITLE', index: 0 },
					},
					{
						objectId: subtitleTextId,
						layoutPlaceholder: { type: 'SUBTITLE', index: 0 },
					},
				],
			},
        },
        {
			insertText: {
				objectId: titleTextId,
				text: titleText,
			},
		},
        {
           insertText: {
                objectId: subtitleTextId,
                text: subtitleText
            } 
        }
        
    ]
    return titleSlideReq
}

function createVocabSlide(vocabText, bodyText){
    console.log(
        chalk.white("creating slide for word"),
        chalk.yellow(vocabText)
    )

    const vocabSlideId = uuid()
    const vocabTextId = uuid()
    const bodyTextId = uuid()

    const vocabSlideReq = [
        {
            createSlide: {
                objectId: vocabSlideId,
                slideLayoutReference: {
                    predefinedLayout: 'TITLE_AND_BODY'
                },
                placeholderIdMappings: [
					{
						objectId: vocabTextId,
						layoutPlaceholder: { type: 'TITLE', index: 0 },
					},
					{
						objectId: bodyTextId,
						layoutPlaceholder: { type: 'BODY', index: 0 },
					},
				],
			},
		},
		{
			insertText: {
				objectId: vocabTextId,
				text: vocabText,
			},
		},
        {
            insertText: {
				objectId: bodyTextId,
				text: `Definition: ${bodyText}`,
			},
        }
    ]

    return vocabSlideReq
}

function makeBatchUpdate(presentationId, req){
    console.log(chalk.greenBright('Making Slides Batch Update'))
    slides.presentations.batchUpdate({
        presentationId,
        requestBody: {
            requests: req,
        }
    })
}