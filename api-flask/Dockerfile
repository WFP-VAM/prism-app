FROM tiangolo/meinheld-gunicorn-flask:python3.8

COPY ./app /app

COPY requirements.txt .

RUN pip3 install --upgrade pip
RUN pip3 install -r requirements.txt
RUN pip3 install greenlet==0.4.17
