const fs = require("fs");
const normalize = require("./normalize");

let verses = JSON.parse(fs.readFileSync("verses.json").toString())
let transcriptions = JSON.parse(fs.readFileSync("transcription2.json").toString()).filter(transcription => transcription.text.length)

let subVerses = []

for(let verse of verses) {
    const splits = verse.text.split(/[:,;.]/)
    for(let s = 0; s < splits.length; s++) {
        subVerses.push({
            number: verse.number + ":" + s,
            text: splits[s].trim()
        })
    }

}

verses = subVerses.filter(verse => verse.text.length)


let allVerseWords = []
for (let verse of verses) {
    verse.verseWords = [];
    verse.time = undefined;
    for (let word of normalize(verse.text)) {
        const verseWord = {
            id: allVerseWords.length,
            position: verse.verseWords.length,
            top: undefined,
            verse,
            word,
            transcriptionWords: []
        }
        verse.verseWords.push(verseWord)
        allVerseWords.push(verseWord)
    }
}


let allTranscriptionWords = []
for (let i = 0; i < transcriptions.length; i++) {
    const transcription = transcriptions[i]
    transcription.transcriptionWords = []
    transcription.index = i;

    const words = normalize(transcription.text);
    const wordAverageDuration = transcription.duration / words.length

    words.forEach((word, wordIndex) => {
        const transcriptionWord = {
            id: allTranscriptionWords.length,
            position: transcription.transcriptionWords.length,
            top: undefined,
            transcription,
            word,
            verseWords: [],
            time: transcription.time + wordIndex * wordAverageDuration
        };
        transcription.transcriptionWords.push(transcriptionWord)
        allTranscriptionWords.push(transcriptionWord)
    })
}

const {Levenshtein, DamerauLevenshtein, Dice, Hamming, Jaccard, Jaro, JaroWinkler, OSA} = require('hermetrics');
const metric = new Levenshtein();

const {createCanvas} = require('canvas')

/*
const matrixCanvas = createCanvas(allTranscriptionWords.length, allVerseWords.length)
const matrixCtx = matrixCanvas.getContext('2d')

for(let j = 0; j < allVerseWords.length; j++) {
    for(let i = 0; i < allTranscriptionWords.length; i++) {
        let score = 1;

        // score = allVerseWords[j].word.replace(/[aeiouy]/g, "") === allTranscriptionWords[i].word.replace(/[aeiouy]/g, "") ? 1 : 0;

        score *= metric.similarity(allVerseWords[j].word, allTranscriptionWords[i].word);
        score *= metric.similarity(allVerseWords[j].word.replace(/[aeiouy]/g, ""), allTranscriptionWords[i].word.replace(/[aeiouy]/g, ""));


        if(i < allTranscriptionWords.length - 1 && j < allVerseWords.length - 1) {
            // score *= metric.similarity(allVerseWords[j + 1].word, allTranscriptionWords[i + 1].word);
            score *= metric.similarity(allVerseWords[j + 1].word.replace(/[aeiouy]/g, ""), allTranscriptionWords[i + 1].word.replace(/[aeiouy]/g, ""));
        }
        //
        // if(i < allTranscriptionWords.length - 2 && j < allVerseWords.length - 2) {
        //     score *= metric.similarity(allVerseWords[j + 2].word, allTranscriptionWords[i + 2].word);
        //     score *= metric.similarity(allVerseWords[j + 2].word.replace(/[aeiouy]/g, ""), allTranscriptionWords[i + 2].word.replace(/[aeiouy]/g, ""));
        // }

        if(Math.abs(i - j) > Math.abs(allTranscriptionWords.length - allVerseWords.length)) {
            score = 0;
        }



        let c = Math.round(255 - score * 255);

        // let r = i === j ? (allVerseWords[j].verse.number % 2 === 0 ? 0 : 255) : 255;
        // let g = i === j ? (allVerseWords[j].verse.number % 2 === 1 ? 0 : 255) : 255;
        let r = i === j ? (allTranscriptionWords[i].transcription.index % 2 === 0 ? 0 : 255) : 255;
        let g = i === j ? (allTranscriptionWords[i].transcription.index % 2 === 1 ? 0 : 255) : 255;

        r = Math.min(r, c);
        g = Math.min(g, c);

        matrixCtx.fillStyle = "rgba("+r+","+g+","+c+","+(255)+")";
        matrixCtx.fillRect( i, j, 1, 1 );
    }
}

const matrixOut = fs.createWriteStream(__dirname + '/matrix-H3.png')
const matrixStream = matrixCanvas.createPNGStream()
matrixStream.pipe(matrixOut)
matrixOut.on('finish', () =>  console.log('The PNG file was created.'))

 */


const DynamicTimeWarping = require("dynamic-time-warping")

function distance(a, b) {

    if (!a || !b) {
        return Infinity;
    }

    let A = allVerseWords?.[a?.id]?.word || ""
    let B = allTranscriptionWords[b.id]?.word || ""

    let Ap = allVerseWords?.[a?.id - 1]?.word || ""
    let Bp = allTranscriptionWords?.[b.id - 1]?.word || ""

    let An = allVerseWords?.[a?.id + 1]?.word || ""
    let Bn = allTranscriptionWords?.[b.id + 1]?.word || ""

    // console.log(a.word, b.word)

    let coef = 1;
    // if(a.position === 0 && b.position === 0) {
    //     coef = 0.5
    // }

    // const coef = a.position <= 1 && b.position <=1 ? 0 : 1
    // return metric.distance(A, B) + metric.distance(Ap, Bp) + metric.distance(An, Bn);
    // return metric.distance(Ap+A+An, Bp+B+Bn) * coef;// + metric.distance(A.replace(/[aeiouy]/g, ""), B.replace(/[aeiouy]/g, ""));
    return metric.distance(A, B) * coef;// + metric.distance(A.replace(/[aeiouy]/g, ""), B.replace(/[aeiouy]/g, ""));
}

let dtw = new DynamicTimeWarping(allVerseWords, allTranscriptionWords, distance);

const fontSize = 11;

const listCanvas = createCanvas(500, Math.max(allTranscriptionWords.length, allVerseWords.length) * fontSize)
const listCtx = listCanvas.getContext('2d')
listCanvas.font = `${fontSize} monospace`;


const path = dtw.getPath();

for (let i = 0; i < path.length; i++) {
    allVerseWords[path[i][0]].transcriptionWords.push(allTranscriptionWords[path[i][1]])
    allTranscriptionWords[path[i][1]].verseWords.push(allVerseWords[path[i][0]])
}

for(let transcription of transcriptions) {
    const commonTranscriptionWords = []

    let firstTranscriptionVerse = transcription.transcriptionWords[0].verseWords[0].verse;

    let transcriptionVerses = new Set();

    for(let transcriptionWord of transcription.transcriptionWords) {

        for(let verseWord of transcriptionWord.verseWords) {
            transcriptionVerses.add(verseWord.verse)
        }

        if(transcriptionWord.verseWords.some(verseWord => verseWord.verse !== firstTranscriptionVerse)) {
            commonTranscriptionWords.push(transcriptionWord)
        }
    }
    if(commonTranscriptionWords.length) {
        console.log("=============== Error =======================")
        //console.log("T:", transcription.transcriptionWords.map(transcriptionsWord => transcriptionsWord.word).join(" "))
        console.log("common words:", commonTranscriptionWords.map(transcriptionWord => transcriptionWord.word).join(" "))
       // console.log()
        let localVerseWordsByVerse = []
        let localeTranscriptionWordsByVerse = []

        let localeComparisons = []

        for(let verse of transcriptionVerses) {
            let localVerseWords = verse.verseWords.filter(verseWord => !verseWord.transcriptionWords.some(transcriptionsWord => transcriptionsWord.transcription !== transcription) )

            // console.log("v:", localVerseWords.map(verseWord => verseWord.word).join(" "))

            // if(verse.number === 27) {
            //     debugger;
            // }


            let localeDistance = Infinity
            let localDtw;

            if(localVerseWords.length) {
                localDtw = new DynamicTimeWarping(localVerseWords, transcription.transcriptionWords, distance);
                const maxDistance = Math.max(
                    localVerseWords.reduce((acc, versesWord) => acc+versesWord.word.length, 0),
                    transcription.transcriptionWords.reduce((acc, transcriptionWord) => acc+transcriptionWord.word.length, 0),
                )
                localeDistance = localDtw.getDistance()/localVerseWords.length
            } else {
                continue
            }

            let start = transcription.transcriptionWords.findIndex(transcriptionWord => transcriptionWord.verseWords.every(versesWord => versesWord.verse === verse))
            let end = transcription.transcriptionWords.findIndex((transcriptionWord) => transcriptionWord.position > start && transcriptionWord.verseWords.some((versesWord) => versesWord.verse !== verse))
            if(start !== -1 && end === -1) { end = transcription.transcriptionWords.length-1}
            let localeTranscriptionWords = transcription.transcriptionWords.slice(start,end+1)


            localVerseWordsByVerse.push({verse, localVerseWords})
            localeTranscriptionWordsByVerse.push({verse, localeTranscriptionWords})

            localeComparisons.push({
                verse,
                localVerseWords,
                localDtw,
                distance: localeDistance
            })

            // console.log("T/v", (localeDistance), "@", verse.number, transcription.transcriptionWords.map(transcriptionsWord => transcriptionsWord.word).join(" "))
            // console.log(" v ", String(xDtw.getDistance()/localVerseWords.length || Infinity).replace(/./g, " "), " ", String(verse.number).replace(/./g, " "), localVerseWords.map(verseWord => verseWord.word).join(" "))
            // console.log("v/t", xDtw.getDistance()/localVerseWords.length || Infinity, "@", verse.number, localeTranscriptionWords.map(transcriptionsWord => transcriptionsWord.word).join(" "))
            // console.log()

        }

        const localeComparisonResults = {
            transcription: {
                index: transcription.index,
                text: transcription.text,
            },
            verses: localeComparisons.map(localeComparison => {
                return {
                    number: localeComparison.verse.number,
                    text: localeComparison.verse.text,
                    reducedText: localeComparison.localVerseWords.map(verseWord => verseWord.word).join(" "),
                    distance: localeComparison.distance
                }
            })
        }

        console.log(localeComparisonResults)

        // for(let {verse, localVerseWords} of localVerseWordsByVerse) {
        //     for(let {verse: supposedTranscriptionVerse, localeTranscriptionWords} of localeTranscriptionWordsByVerse) {
        //
        //         let xDtw = new DynamicTimeWarping(localVerseWords, localeTranscriptionWords, distance);
        //         console.log(Math.round(xDtw.getDistance()/localVerseWords.length), verse.number, localVerseWords.map(versesWord => versesWord.word).join(" "), "///", supposedTranscriptionVerse.number, localeTranscriptionWords.map(transcriptionsWord => transcriptionsWord.word).join(" "))
        //     }
        // }



        console.log()

        commonTranscriptionWords.forEach(transcriptionWord => { transcriptionWord.error = true })


    }
}

// for (let i = 0; i < verses.length - 1; i++) {
//     let currentVerse = verses[i]
//     let nextVerse = verses[i + 1]
//
//     const currentTranscriptionWords = allTranscriptionWords.filter(transcriptionWord => transcriptionWord.verseWords.some(versesWord => versesWord.verse === currentVerse))
//     const nextTranscriptionWords = allTranscriptionWords.filter(transcriptionWord => transcriptionWord.verseWords.some(versesWord => versesWord.verse === nextVerse))
//
//     const commonTranscriptionWords = currentTranscriptionWords.filter(transcriptionWord => nextTranscriptionWords.includes(transcriptionWord));
//
//     if (commonTranscriptionWords.length) {
//         console.log("Erreur")
//         console.log(currentVerse.text)
//         console.log(nextVerse.text)
//         console.log(commonTranscriptionWords.map(tw => tw.word))
//         console.log()
//     }
//
// }

for (let top = 0, i = 0; i < verses.length; i++) {
    const verseHeight = verses[i].verseWords.length

    const verseTranscriptionWords = allTranscriptionWords
        .filter(transcriptionWord => transcriptionWord.verseWords.some(versesWord => verses[i].verseWords.includes(versesWord)))

    const transcriptionHeight = verseTranscriptionWords.length

    for (let j = 0; j < verseHeight; j++) {
        verses[i].verseWords[j].top = top + j
    }

    for (let j = 0; j < verseTranscriptionWords.length; j++) {
        verseTranscriptionWords[j].top = top + j
    }

    top += Math.max(verseHeight, transcriptionHeight)
    // console.log(verseHeight, transcriptionHeight, verses[i].text)
}

for (let i = 0; i < path.length; i++) {
    listCtx.lineWidth = "1px"

    let prevLeft = allVerseWords[path[i][0] - 1]
    let currentVerseWord = allVerseWords[path[i][0]]
    let nextLeft = allVerseWords[path[i][0] + 1]
    let currentTranscriptionWord = allTranscriptionWords[path[i][1]]


    listCtx.fillStyle = currentVerseWord.verse.number % 2 === 0 ? "cyan" : "yellow"
    listCtx.fillText("■", 1, fontSize * (1 + currentVerseWord.top));

    listCtx.fillStyle = currentTranscriptionWord.transcription.index % 2 === 0 ? "cyan" : "yellow";
    listCtx.fillText("■", 200, fontSize * (1 + currentTranscriptionWord.top));


    listCtx.strokeStyle = ["red", "green", "blue", "orange", "magenta", "black"][i % 6]
    listCtx.fillStyle = ["red", "green", "blue", "orange", "magenta", "black"][i % 6]

    listCtx.beginPath()
    listCtx.moveTo(100, fontSize * currentVerseWord.top + fontSize / 2)
    listCtx.lineTo(200, fontSize * currentTranscriptionWord.top + fontSize / 2)
    listCtx.stroke()

    // const dists = `(${distance(prevLeft, currRight)}) (${distance(currentVerseWord, currRight)}) (${distance(nextLeft, currRight)})`

    // currentVerseWord.transcriptionWords.map(transcriptionWord => transcriptionWord.transcription.index)
    // currentTranscriptionWord.verseWords.map(verseWord => verseWord.verse.number)

    const dist = distance(currentVerseWord, currentTranscriptionWord);

    const error = currentTranscriptionWord.error ? `       /!\\ ` : ''

    listCtx.fillText("   " + currentVerseWord.word + currentVerseWord.verse.number + error , 1, fontSize * (1 + currentVerseWord.top));
    listCtx.fillText("   " + currentTranscriptionWord.word + currentTranscriptionWord.transcription.index + error, 200, fontSize * (1 + currentTranscriptionWord.top));


}


const listOut = fs.createWriteStream(__dirname + '/list-DTW.png')
const listStream = listCanvas.createPNGStream()
listStream.pipe(listOut)
listOut.on('finish', () => console.log('The PNG file was created.'))


for (let verse of verses) {
    verse.time = verse.verseWords[0]?.transcriptionWords?.[0]?.time
}


fs.writeFileSync("timedVerses.js", "timedVerses=" + JSON.stringify(verses.map(({time, number, text}) => ({
    time,
    number,
    text
}))))