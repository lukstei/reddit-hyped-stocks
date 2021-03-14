# frontend
FROM node:15-buster-slim AS frontend

COPY frontend /app/frontend
WORKDIR /app/frontend

RUN npm ci
RUN npm run build

# backend
FROM python:3.9-slim-buster

RUN mkdir -p /app/backend
WORKDIR /app/backend

COPY backend/requirements.txt /app/backend/
RUN pip install -r requirements.txt

COPY backend /app/backend
COPY --from=frontend /app/frontend/build /app/frontend/build

ENTRYPOINT ["python"]
CMD ["server.py"]

# docker build -t pennystocks . && docker run --rm -it -p 5000:5000 -v $PWD/backend/data.db:/app/backend/data.db pennystocks load_data.py