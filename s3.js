const {
    S3,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl  } = require("@aws-sdk/s3-request-presigner");

const bucketName = process.env.BUCKET
const region = process.env.BUCKET_REGION
const accessKeyId = process.env.AWS_KEY
const secretAccessKey = process.env.AWS_SECRET

const s3Client = new S3({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey
  }
})


exports.uploadFile = (fileBuffer, fileName, mimetype) => {
  const uploadParams = {
    Bucket: bucketName,
    Body: fileBuffer,
    Key: fileName,
    ContentType: mimetype
  }

  return s3Client.send(new PutObjectCommand(uploadParams));
}

exports.deleteFile = (fileName) => {
  const deleteParams = {
    Bucket: bucketName,
    Key: fileName,
  }

  return s3Client.send(new DeleteObjectCommand(deleteParams));
}

exports.getObjectSignedUrl = async (key) => {
  const params = {
    Bucket: bucketName,
    Key: key
  }

  const command = new GetObjectCommand(params);
  const seconds = 150
  const url = await getSignedUrl(s3Client, command, { expiresIn: seconds });

  return url
}