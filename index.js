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
const titleText = 'Vocab #3'
const subtitleText = 'James Nelson 11A'
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

// create the slides
req.push(createTitleSlide(titleText, subtitleText))

for(let i = 0; i < words.length; i++){
    const word = words[i]
    req.push(createVocabSlide(word, await getDefinition(word), await getSentence(word), await getImage(word)))
    //console.log(typeof await getDefinition(word))
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

async function getSentence(word){

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
        .catch(err => console.error('error:' + err))
    return result

    async function getSynonyms(word){
        const response = await fetch(
            `https://dictionaryapi.com/api/v3/references/ithesaurus/json/${word}?key=${process.env.ITHESAURUS_KEY}`
        )
        const json = await response.json()
        let synonyms = json[0].meta.syns[0]
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
                        let regex = new RegExp(`${synonyms[i]}`, 'gmi')
                        let subst = `${word.toLowerCase()}` 
                        result =  json.examples[0].replace(regex, subst)
                    }
                })
                .catch(err => console.error('error:' + err))
        }
    }
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
            `https://dictionaryapi.com/api/v3/references/ithesaurus/json/${word}?key=${process.env.ITHESAURUS_KEY}`
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




        //if no image is found for the word
		console.log(chalk.red('no image found for ' + word))
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

function makeBatchUpdate(presentationId, req){
    console.log(chalk.greenBright('Making Slides Batch Update'))
    slides.presentations.batchUpdate({
        presentationId,
        requestBody: {
            requests: req,
        }
    })
}