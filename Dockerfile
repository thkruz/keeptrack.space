FROM nginx
# Copy the build files from builder's /app/dist to the nginx container

COPY ./dist /usr/share/nginx/html
CMD [ "nginx", "-g", "daemon off;" ]
