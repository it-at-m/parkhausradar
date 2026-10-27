# For documentation see https://github.com/sclorg/s2i-python-container
# The collector has no runtime dependencies, so the image needs neither uv nor downloads besides this base image
FROM registry.access.redhat.com/ubi10/python-314-minimal:10.2-1792484457@sha256:8114f8e3f19a4d5b0cc2f0022e409dee5f296d69207aa489a892c01b8ab4a17f

COPY *.py garages.json ./

CMD ["python3", "-u", "main.py"]
