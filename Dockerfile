FROM node

WORKDIR /app
ENV NODE_ENV production

COPY package.json /app/package.json

RUN npm install --production

COPY . /app

CMD ["npm","start"]

EXPOSE 7770
