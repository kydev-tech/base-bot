const FormData = require('form-data');
const Jimp = require('jimp');

async function remini(imageBuffer, action) {
    return new Promise(async (resolve, reject) => {
        const validActions = ['enhance', 'recolor', 'dehaze'];
        action = validActions.includes(action) ? action : 'enhance';

        let apiUrl = 'https://inferenceengine.vyro.ai/' + action;
        
        let formData = new FormData();
        formData.append('model_version', 1, {
            'Content-Transfer-Encoding': 'binary',
            'contentType': 'image/jpeg'
        });
        formData.append('image', Buffer.from(imageBuffer), {
            'filename': 'enhance_image_body.jpg',
            'contentType': 'image/jpeg'
        });

        formData.submit({
            url: apiUrl,
            host: 'inferenceengine.vyro.ai',
            path: '/' + action,
            protocol: 'https:',
            headers: {
                'User-Agent': 'okhttp/4.9.3',
                'Connection': 'Keep-Alive',
                'Accept-Encoding': 'gzip'
            }
        }, (err, res) => {
            if (err) return reject(err);

            let chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => resolve(Buffer.concat(chunks)));
            res.on('error', () => reject());
        });
    });
}

module.exports.remini = remini;