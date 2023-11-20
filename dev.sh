# initial client to develop
cd ./ionic-client
npm run dev &

# initial server to develop
cd ../
cp -r ./shared-types ./web-server/shared-types
cd ./web-server
npm run start:dev