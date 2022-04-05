FROM docker:latest

RUN apk add --update npm 

WORKDIR /bot

COPY package.json .
RUN npm install

COPY . /bot

ENTRYPOINT ["npm", "run", "start"]

