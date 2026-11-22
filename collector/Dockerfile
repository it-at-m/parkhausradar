# For documentation see https://github.com/sclorg/s2i-python-container
# The collector has no runtime dependencies, so the image needs neither uv nor downloads besides this base image
FROM registry.access.redhat.com/ubi10/python-314-minimal:10.3-1795234906@sha256:6a3ac934913b426ccf9a9d8406084e47044ef8da88a6722a3acc60ac990595c3

COPY *.py garages.json ./

CMD ["python3", "-u", "main.py"]
