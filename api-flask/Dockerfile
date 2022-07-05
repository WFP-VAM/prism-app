FROM tiangolo/uwsgi-nginx-flask:python3.8

COPY ./app /app

COPY requirements.txt .

RUN pip install --upgrade pip
RUN pip install -r requirements.txt
RUN pip install greenlet==0.4.17
