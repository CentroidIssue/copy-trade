FROM node:21

WORKDIR /copy-trade

ADD . /copy-trade

RUN npm i

EXPOSE 10000

CMD ["node", "index.js"]