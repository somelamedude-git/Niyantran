import torch
import torch.nn as nn


class DryEyeLSTM(nn.Module):
    def __init__(self, input_size: int = 10, hidden_size: int = 64, num_layers: int = 2, dropout: float = 0.3):
        super(DryEyeLSTM, self).__init__()
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0.0
        )
        self.classifier = nn.Sequential(
            nn.Linear(hidden_size, 32),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(32, 1),
            nn.Sigmoid()
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        lstm_out, _ = self.lstm(x)
        last_out = lstm_out[:, -1, :]
        return self.classifier(last_out)


class LSTMWrapper:
    def __init__(self, weights_path: str, input_size: int = 10, device: str = "cpu"):
        self.device = torch.device(device)
        self.model = DryEyeLSTM(input_size=input_size)
        self.model.load_state_dict(torch.load(weights_path, map_location=self.device))
        self.model.to(self.device)
        self.model.eval()

    def predict(self, features) -> float:
        import numpy as np
        x = torch.tensor(features, dtype=torch.float32).unsqueeze(0).to(self.device)
        with torch.no_grad():
            prob = self.model(x).item()
        return prob
