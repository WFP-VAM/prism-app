FROM python:3.10

COPY ./app /app

WORKDIR /app/

ENV PYTHONPATH=/

COPY requirements.txt .

RUN pip install --upgrade pip
RUN pip install -r requirements.txt
