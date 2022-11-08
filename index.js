// imports
import { google } from 'googleapis'
import { v4 as uuid } from 'uuid'
import chalk from 'chalk'
import fetch from 'node-fetch'
import * as dotenv from 'dotenv'
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
const titleText = 'Vocab #6'
const subtitleText = 'James Nelson 11A'
let req = []

const words = [
    'Cacophony',
    'Clairvoyance',
    'Incisive',
    'Benign',
    'Vacillate',
    'Obstreperous',
    'Belittle',
    'Voluminous',
    'Archaic',
    'Patronize',
    'Incontrovertible',
    'Precarious',
    'Dismiss',
    'Obstinate',
    'Dissipate',
    'Circumvent',
    'Indignation',
    'Penitent',
    'Genial',
    'Incorrigible',
]

// create the slides
req.push(createTitleSlide(titleText, subtitleText))

const testImage = 'https://webhostingmedia.net/wp-content/uploads/2018/01/http-error-404-not-found.png'

for(let i = 0; i < words.length; i++){
    const word = words[i]
    req.push(createVocabSlide(word, await getDefinition(word), await getSentence(word), await getImage(word)))
    //console.log(typeof await getDefinition(word))
}
makeBatchUpdate(process.env.PRESENTATION_ID, req)

//get the definition for the vocab word
async function getDefinition(word){
    console.log(chalk.blue('fetching definition for'), chalk.magenta(word))

    //fetch the definition from merriam webster
    const response = await fetch(
		`https://dictionaryapi.com/api/v3/references/learners/json/${word}?key=${process.env.LEARNERS_KEY}`
	)
    let json = await response.json()
	
    //if the definition cant be found
    if(json[0].shortdef[0]){
        return json[0].shortdef[0]
    }else{
        console.log(chalk.cyan('fetching collegiate definition for'), chalk.magenta(`${word}`))

        const response = await fetch(
            `https://dictionaryapi.com/api/v3/references/collegiate/json/${word}?key=${process.env.DICTIONARY_KEY}`
        )
        json = await response.json()
        return json[0].shortdef[0]
    }
}

//get the sentence for the vocab word
async function getSentence(word){

    //fetch the sentence of the word from WordsAPI
    const url = `https://wordsapiv1.p.rapidapi.com/words/${word.toLowerCase()}/examples`;
    let result

    const options = {
        method: 'GET',
        headers: {
            'X-RapidAPI-Key': process.env.WORDSAPI_KEY,
            'X-RapidAPI-Host': 'wordsapiv1.p.rapidapi.com'
        }
    }

    await fetch(url, options)
        .then(res => res.json())
        .then(async json => {
            if(json.examples[0] == undefined){
                console.log(chalk.yellow('fetching sentence for synonym of'), chalk.magenta(`${word}`))
                return await getSynonyms(word)
            }
            console.log(chalk.green(`fetching sentence for`), chalk.magenta(`${word}`))
            result =  json.examples[0]
        })
        .catch(err => console.error(chalk.red(`no sentence found for ${word} error: ${err}`)))
    return result

    //if the sentence cant be found for a word, use a synonym for the sentence
    async function getSynonyms(word){
        //fetch synonyms of the word
        const response = await fetch(
            `https://dictionaryapi.com/api/v3/references/thesaurus/json/${word}?key=${process.env.THESAURUS_KEY}`
        )
        const json = await response.json()
        let synonyms = json[0].meta.syns[0]

        //fetch new sentence
        for(let i = synonyms.length-1; i > 0; i--){
            const url = `https://wordsapiv1.p.rapidapi.com/words/${synonyms[i]}/examples`;
        
            const options = {
                method: 'GET',
                headers: {
                    'X-RapidAPI-Key': process.env.WORDSAPI_KEY,
                    'X-RapidAPI-Host': 'wordsapiv1.p.rapidapi.com'
                }
            }

            await fetch(url, options)
                .then(res => res.json())
                .then(json => {
                    if(json.examples[0] != undefined){
                        //use regex to replace the synonym with the vocab word
                        let regex = new RegExp(`${synonyms[i]}`, 'gmi')
                        let subst = `${word.toLowerCase()}` 
                        result =  json.examples[0].replace(regex, subst)
                    }
                })
                .catch(err => console.error(chalk.red(`no sentence found for ${word} error: ${err}`)))
        }
    }
}

async function getImage(word) {
	console.log(chalk.blue('Fetching image for'), chalk.blueBright(word))

    //find image for the vocab word
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
		return 'https://webhostingmedia.net/wp-content/uploads/2018/01/http-error-404-not-found.png'
	}

    //if no results for the image are found from unsplash
	if (!image.response.results[0]) {
        //find a synonym using merriam webster
        const response = await fetch(
            `https://dictionaryapi.com/api/v3/references/thesaurus/json/${word}?key=${process.env.THESAURUS_KEY}`
        )
        const json = await response.json()
        let synonyms = json[0].meta.syns[0]

        //loop through the synonyms until an image is found
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
            }else if(image.errors){
                // error occured
                console.log(chalk.red('error occured: ' + image.errors[0]))
                return 'https://webhostingmedia.net/wp-content/uploads/2018/01/http-error-404-not-found.png'
            }else{
                continue
            }
        }

        //if no image is found for the word
		console.log(chalk.red('no image found for ' + word))

		// use default image
		return 'https://webhostingmedia.net/wp-content/uploads/2018/01/http-error-404-not-found.png'
	}

	return image.response.results[0].urls.regular
}

//create the title slide for the presentation
function createTitleSlide(titleText, subtitleText){
    console.log(chalk.cyanBright('creating title for presentation'))

    //uuids for the components
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

//create the vocab slide for each word in the presentation
function createVocabSlide(vocabText, bodyText, sentenceText, imageUrl){
    console.log(
        chalk.white("creating slide for word"),
        chalk.magenta(vocabText)
    )

    //uuids of the components
    const vocabSlideId = uuid()
    const vocabTextId = uuid()
    const bodyTextId = uuid()
    const imageId = uuid()

    //units for the components
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
						translateX: 402.5,
						translateY: 140,
						unit: 'PT',
					},
				},
			},
		},
    ]

    return vocabSlideReq
}

//make the batch update to the google slides api
function makeBatchUpdate(presentationId, req){
    console.log(chalk.greenBright('Making Slides Batch Update'))
    slides.presentations.batchUpdate({
        presentationId,
        requestBody: {
            requests: req,
        }
    })
}