// imports
import { google } from 'googleapis'
import { v4 as uuid } from 'uuid'
import chalk from 'chalk'
import fetch from 'node-fetch'
import * as dotenv from 'dotenv'
import https from 'https'
import { createApi } from 'unsplash-js'
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

const unsplash = createApi({
	accessKey: process.env.UNSPLASH_ACCESS_KEY,
    fetch: fetch
})

//variables
const titleText = 'Vocab #3'
const subtitleText = 'James Nelson 11A'
let req = []
let sentences = []
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

//get sentences
// for(let i = 0; i < words.length; i++){
//     const word = words[i]
//     const app_id = process.env.OXFORD_APP_ID
//     const app_key = process.env.OXFORD_APP_KEY
//     const wordId = word
//     const fields = "examples"
//     const strictMatch = "false"
//     const options = {
//     host: 'od-api.oxforddictionaries.com',
//     port: '443',
//     path: '/api/v2/entries/en-gb/' + wordId + '?fields=' + fields + '&strictMatch=' + strictMatch,
//     method: "GET",
//     headers: {
//         'app_id': app_id,
//         'app_key': app_key
//     }
//     };
//     https.get(options, (resp) => {
//         let body = ''
//         resp.on('data', (d) => {
//             body += d
//         });
//         resp.on('end', () => {
//            sentences.push(JSON.parse(body).results[0].lexicalEntries[0].entries[0].senses[0].examples[0].text)
//         });
//     });
// }

// create the slides
req.push(createTitleSlide(titleText, subtitleText))


for(let i = 0; i < 5; i++){
    const word = words[i]
    req.push(createVocabSlide(word, await getDefinition(word), 'sen', await getImage(word)))
}
makeBatchUpdate(process.env.PRESENTATION_ID, req)






async function getDefinition(word){
    console.log(chalk.blue('fetching definition for'), chalk.magenta(word))


    const response = await fetch(
		`https://dictionaryapi.com/api/v3/references/learners/json/${word}?key=${process.env.LEARNERS_KEY}`
	)
    const json = await response.json()
	return json[0].shortdef[0]
}

function getSentence(word){
    
}

async function getImage(word) {
	console.log(chalk.blue('Fetching image for'), chalk.blueBright(word))

	let image = await unsplash.search.getPhotos({
		query: word,
		page: 1,
		perPage: 10,
        orientation: 'landscape',
		orderBy: 'relevant',
	})

	if (image.errors) {
		// error occured
		console.log(chalk.red('error occured: ' + image.errors[0]))
		return
	}

	if (!image.response.results[0]) {
        const response = await fetch(
            `https://dictionaryapi.com/api/v3/references/thesaurus/json/${word}?key=${process.env.THESAURUS_KEY}`
        )
        const json = await response.json()
        let synonyms = json[0].meta.syns[0]
        //console.log(synonyms)
        for(let i = 0; i < synonyms.length; i++){
            let image = await unsplash.search.getPhotos({
                query: synonyms[i],
                page: 1,
                perPage: 10,
                orientation: 'landscape',
                orderBy: 'relevant',
            })
            if(image.response.results[0]){
                console.log(chalk.yellow(`fetching image for synonym: ${synonyms[i]}`))
                return image.response.results[0].urls.regular
            }else{
                continue
            }
        }





		//console.log(chalk.red('no image found for ' + word))
		// use default image
		return 'https://webhostingmedia.net/wp-content/uploads/2018/01/http-error-404-not-found.png'
	}

	return image.response.results[0].urls.regular
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

function createVocabSlide(vocabText, bodyText, sentenceText, imageUrl){
    console.log(
        chalk.white("creating slide for word"),
        chalk.magenta(vocabText)
    )

    const vocabSlideId = uuid()
    const vocabTextId = uuid()
    const bodyTextId = uuid()
    const imageId= uuid()

    const emu4M = {
		magnitude: 4000000,
		unit: 'EMU',
	}

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
				text: `Definition: ${bodyText} \nSentence: ${sentenceText}`,
			},
        },
        {
			createImage: {
				objectId: imageId,
				url: imageUrl,
				elementProperties: {
					pageObjectId: vocabSlideId,
					size: {
						height: emu4M,
						width: emu4M,
					},
					transform: {
						scaleX: 1,
						scaleY: 1,
						translateX: 5_000_000,
						translateY: 1_500_000,
						unit: 'EMU',
					},
				},
			},
		},
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