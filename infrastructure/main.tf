module "timeoff_gke_cluster" {
  source                   = "./modules/tf-timeoff-gke/"
  gcp_account_id           = "big-liberty-373120"
  cluster_name             = "timeoff"
  cluster_svc_account_name = "timeoff"
  node_pool_name           = "timeoff"


}