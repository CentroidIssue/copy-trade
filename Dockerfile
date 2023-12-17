# Include node_modules/.bin in $PATH

FROM node:12.22.9

WORKDIR /copy-trade

ADD . /copy-trade

RUN npm i

CMD ["node", "bybit.js"]