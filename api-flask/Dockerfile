FROM tiangolo/meinheld-gunicorn-flask:python3.9

COPY ./app /app

COPY requirements.txt .

RUN pip install --upgrade pip
RUN pip install numpy

# Install GDAL (after numpy)
RUN apt-get update
RUN apt-get install software-properties-common -y
RUN add-apt-repository ppa:ubuntugis/ppa -y
RUN apt-get install gdal-bin -y
RUN apt-get install libgdal-dev -y
RUN pip install GDAL==3.2.2

# Install requirements
RUN pip install -r requirements.txt
RUN pip install greenlet==0.4.17
