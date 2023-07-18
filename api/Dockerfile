# only image with python 3.10 on it
# other GDAL images use python 3.8
# This provides GDAL 3.6dev
FROM osgeo/gdal:ubuntu-small-latest

COPY ./app /app

WORKDIR /app/

ENV PYTHONPATH=/

COPY requirements.txt .

RUN apt update
RUN apt install -y python3-pip libpq-dev
RUN pip install --upgrade pip
RUN pip install -r requirements.txt
RUN playwright install firefox
RUN playwright install-deps

EXPOSE 80
