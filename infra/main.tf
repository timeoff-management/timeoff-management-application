terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "4.49.0"
    }
  }
}

provider "google" {
  project = "gorilla-logic"
  region  = "us-central1"
  zone    = "us-central1-c"
}

resource "google_compute_network" "vpc_network" {
  name = "time-iac-network"
}

resource "google_compute_subnetwork" "default" {
  name          = "time-subnet"
  ip_cidr_range = "10.0.1.0/24"
  #region        = "us-west1"
  network = google_compute_network.vpc_network.id
}

resource "google_compute_instance" "vm_instance" {
  name         = "time-instance"
  machine_type = "e2-micro"
  tags         = ["time"]

  boot_disk {
    initialize_params {
      image = "ubuntu-os-cloud/ubuntu-2004-lts"
    }
  }

  network_interface {
    subnetwork = google_compute_subnetwork.default.id
    access_config {
    }
  }

}

resource "google_compute_firewall" "allow-http" {
  name    = "time-fw-ssh"
  network = google_compute_network.vpc_network.id
  allow {
    protocol = "tcp"
    ports    = ["80"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["time"]
}

resource "google_compute_firewall" "allow-htps" {
  name    = "time-jenkins"
  network = google_compute_network.vpc_network.id
  allow {
    protocol = "tcp"
    ports    = ["443"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["time"]
}

output "ip" {
  value = google_compute_instance.vm_instance.network_interface.0.access_config.0.nat_ip
}