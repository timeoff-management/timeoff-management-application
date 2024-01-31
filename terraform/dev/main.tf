# Create VPC
resource "google_compute_network" "vpc" {
  name                    = "${var.project_id}-vpc"
  auto_create_subnetworks = "false"
}

# Create Subnet
resource "google_compute_subnetwork" "subnet" {
  name          = "${var.project_id}-subnet"
  region        = var.region
  network       = google_compute_network.vpc.name
  ip_cidr_range = "10.10.0.0/24"
}

# Create GKE cluster (with a separately managed node pool)
resource "google_container_cluster" "cluster" {
  name     = var.cluster_name
  location = var.region
  remove_default_node_pool = true
  initial_node_count = var.node_count

  network    = google_compute_network.vpc.name
  subnetwork = google_compute_subnetwork.subnet.name
}

resource "google_container_node_pool" "pool" {
  name = var.pool_name
  location   = var.region
  cluster = google_container_cluster.cluster.name
  node_count = var.node_count

  node_config {
    preemptible  = true # Since this is a dev env, we are using preemp machines to reduce costs.
    machine_type = "e2-micro"

    # Google recommends custom service accounts that have cloud-platform scope and permissions granted via IAM Roles.
    # service_account = google_service_account.default.email
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]
  }
}

# Create registry to store images/other artifacts
resource "google_artifact_registry_repository" "registry-repo" {
  location      = var.region
  repository_id = var.registry_name
  format        = "DOCKER"
}
