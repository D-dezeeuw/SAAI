SAAI: Strudel Augmented Artificial Intelligence

This project is set up as a fun toy to play around with.
You can select some values, and query the AI to generate music patterns for you.

## Prerequisites

in the .env file set up your AI API keys. Only openrouter.ai is now supported because that's what I use.
you have the ability to choose any model you want then, and only pay for the tokens.

I recommend Gemini 3 Flash for is cost/performance. but you can use three different models for each task
- prompt improvement generation (with template context) - use a good creative chat model for this.
- strudel code generation (coding model can be nice)
- studel code alteration (probably easiest so a simple model would do)

## Visualizers

I lean heavy on the visualizers, good music is fun, but seeing the music interact is even beter.
So I created support for Scope + Spectrum analysis from strudel at the same time.
But I also connected it to GLSL shaders, where there are 3 options, which is still a work in progress.

## Install the project
It's a nodejs project so install its dependencies like so:
`npm install`

## Run the project
again it's nodejs.
`npm run dev`

if you want to run it locally.

## License 
License is following strudels license which is AGPL.
See strudel for license details.

## Note
Just have fun, create expand and share it with friends.

