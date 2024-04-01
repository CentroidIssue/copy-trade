FROM node:21

WORKDIR /copy-trade

ADD . /copy-trade

RUN npm i

CMD ["node", "index.js"]