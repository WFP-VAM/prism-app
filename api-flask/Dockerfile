FROM tiangolo/uwsgi-nginx-flask:python3.8

COPY ./app /app

COPY requirements.txt .

RUN pip3 install -r requirements.txt
