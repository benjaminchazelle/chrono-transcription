let fs = require('fs');
let wav = require('node-wav');

module.exports = function noises(wavFile, numberOfVerses) {

    let buffer = fs.readFileSync(wavFile);
    let result = wav.decode(buffer);

    const audioDuration = result.channelData[0].length / result.sampleRate;
    const samples = result.channelData[0].map(datum => Math.abs(datum))

    // Find high dynamic sample for calibrating silence threshold
    let dynamics = [];

    for (let i = 1; i < samples.length - 1; i++) {
        if (samples[i - 1] < samples[i] && samples[i + 1] < samples[i]) {
            dynamics.push(samples[i]);
        }
    }

    dynamics.sort();

    let sensibility = 0;
    let silenceThreshold;
    let silences;

    // Find the sensibility that allow to have at least 1.5 times more silence that verses
    do {

        sensibility += 0.01;

        silenceThreshold = dynamics[Math.round(dynamics.length / 2)] * sensibility;

        let silenceStart = null;
        let silenceDuration = 0;

        silences = [];

        for (let i = 0; i < samples.length; i++) {
            if (samples[i] < silenceThreshold) {
                silenceDuration++;

                if (!silenceStart) {
                    silenceStart = i;
                }
            } else {
                if (silenceStart) {

                    if (silenceDuration > result.sampleRate * 0.25) {
                        silences.push({
                            start: silenceStart / result.sampleRate,
                            duration: silenceDuration / result.sampleRate
                        })
                    }

                    silenceStart = null;
                }
                silenceDuration = 0;
            }
        }

    } while (silences.length / 1.5 < numberOfVerses)

    // Determine the noise periods
    let noises = [];
    let start = 0;

    for (let silence of silences) {
        let end = silence.start + silence.duration / 2;

        noises.push({
            start,
            duration: end - start,
            relative : start / audioDuration
        });

        start = end;
    }


    noises.push({
        start,
        duration: audioDuration - start,
        relative : start / audioDuration
    });

    return noises;

}