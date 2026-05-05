provider "aws" {
  region = "us-east-1" # Adjust as needed
}

module "networking" {
  source = "./modules/networking"
}

module "compute" {
  source = "./modules/compute"
}

module "database" {
  source = "./modules/database"
}

module "storage" {
  source = "./modules/storage"
}
