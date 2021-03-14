FROM node:14.16.0-buster 

WORKDIR /app

COPY . /app/

RUN npm i --save
RUN npm i --save-dev
RUN npm i typescript --global

CMD npm run start