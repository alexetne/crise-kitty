FROM node:24-alpine

WORKDIR /usr/src/app

COPY package*.json ./
COPY prisma ./prisma

RUN npm install
RUN npm run prisma:generate

COPY . .

EXPOSE 5001

CMD ["npm", "run", "dev"]
