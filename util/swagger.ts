import * as swaggerUI from 'swagger-ui-express';
import * as swaggerJSDoc from 'swagger-jsdoc';
import * as fs from 'fs';

export function setup(app: any): void {
    var options = {
        swaggerDefinition: {
            info: {
                title: 'dncash.io APIs', // Title (required) 
                version: process.env.npm_package_version, // Version (required)
                description: fs.readFileSync('./HOWTO.md').toString()
            }
        },
        apis: ['./routes/*'], // Path to the API docs 
    };

    var swaggerSpec = swaggerJSDoc(options); // line 36 
    
    // ... 
    app.get('/dnapi/docs.json', function(req, res) { // line 41 
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
    });
    
    // ... 
    app.use('/dnapi/docs', swaggerUI.serve, swaggerUI.setup(swaggerSpec, {
        swaggerOptions: {docExpansion: 'none'},
        customCss: '.swagger-ui .info code { background: none; color: black; font-weight: normal; font-size: .9em; }'
    })); // line 45 
}
