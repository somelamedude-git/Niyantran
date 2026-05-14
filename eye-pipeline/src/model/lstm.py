import torch


class LSTMWrapper:
    def __init__(self, weights_path: str, device: str = "cpu"):
        self.device = torch.device(device)
        self.model = torch.load(weights_path, map_location=self.device, weights_only=False)
        self.model.to(self.device)
        self.model.eval()

    def predict(self, features) -> float:
        x = torch.tensor(features, dtype=torch.float32).unsqueeze(0).to(self.device)
        with torch.no_grad():
            prob = self.model(x).item()
        return prob
