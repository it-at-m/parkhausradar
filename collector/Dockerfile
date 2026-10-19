# For documentation see https://github.com/sclorg/s2i-python-container
FROM registry.access.redhat.com/ubi10/python-314-minimal:10.2-1791464217@sha256:8e385670e8a2ef3ca18f5bc3ef005a424601b58f2964d5a144861be544537624

COPY *.py garages.json ./

CMD ["python3", "-u", "main.py"]
