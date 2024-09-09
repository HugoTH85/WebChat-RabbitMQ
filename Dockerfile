FROM node:hydrogen-alpine3.20
WORKDIR /root/Projet
COPY ./Projet /root/Projet/
EXPOSE 3000
RUN npm init -y
RUN npm install express socket.io amqplib
CMD [ "node","server.js" ]